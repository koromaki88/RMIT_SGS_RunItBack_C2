#!/usr/bin/env python3
"""Bounded retry of the existing realm's free-tier vendor lifecycle; no realm reset."""

import argparse
import datetime
import fcntl
import json
import os
from pathlib import Path
import shlex
import time
import urllib.error
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never follow a paid-checkout redirect or forward credentials.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--interval", type=int, default=180)
    parser.add_argument("--minutes", type=int, default=30)
    parser.add_argument("--url", default="http://localhost:8080")
    parser.add_argument("--realm", default="recovery-vault")
    args = parser.parse_args()
    if args.interval < 60 or not 1 <= args.minutes <= 180:
        parser.error("Use interval >=60 seconds and a retry window of 1–180 minutes.")

    project = Path(__file__).resolve().parent.parent
    setup = project / ".setup"
    setup.mkdir(mode=0o700, exist_ok=True)
    os.umask(0o077)
    lock = (setup / "license-watch.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit("A licence watcher is already running; no second watcher started.")

    # Read simple operator KEY=VALUE assignments without executing shell configuration.
    config = {}
    for line in (setup / "operator.env").read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, raw = line.partition("=")
        if separator:
            parts = shlex.split(raw)
            if len(parts) == 1:
                config[key.strip()] = parts[0]
    required = ["KC_BOOTSTRAP_ADMIN_USERNAME", "KC_BOOTSTRAP_ADMIN_PASSWORD", "TIDE_LICENSE_EMAIL"]
    if any(not config.get(key) for key in required) or config.get("TIDE_TERMS_ACCEPTED") != "yes":
        raise SystemExit("Private operator configuration or explicit Terms acceptance is missing.")

    opener = urllib.request.build_opener(NoRedirect())
    base = args.url.rstrip("/")
    realm = urllib.parse.quote(args.realm, safe="")

    def request(path, form, token=None, timeout=60):
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        if token:
            headers["Authorization"] = "Bearer " + token
        req = urllib.request.Request(base + path, data=urllib.parse.urlencode(form).encode(), headers=headers)
        try:
            with opener.open(req, timeout=timeout) as response:
                return response.status, response.read(65536).decode(errors="replace")
        except urllib.error.HTTPError as error:
            return error.code, error.read(65536).decode(errors="replace")

    deadline = time.monotonic() + args.minutes * 60
    attempt = 0
    print(f"Watching existing realm {args.realm}: every {args.interval}s, max {args.minutes} minutes.", flush=True)
    while time.monotonic() < deadline:
        if (setup / "license-watch.stop").exists():
            print("Licence watcher stopped by stop file. No further requests made.", flush=True)
            return 0
        attempt += 1
        stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        status = None
        code = "UNAVAILABLE"
        success = False
        try:
            auth_status, auth_body = request("/realms/master/protocol/openid-connect/token", {
                "grant_type": "password", "client_id": "admin-cli",
                "username": config["KC_BOOTSTRAP_ADMIN_USERNAME"],
                "password": config["KC_BOOTSTRAP_ADMIN_PASSWORD"],
            }, timeout=15)
            if auth_status != 200:
                code = "OPERATOR_AUTH_FAILED"
                status = auth_status
            else:
                token = json.loads(auth_body).get("access_token")
                if not token:
                    raise ValueError("No operator token")
                status, body = request(f"/admin/realms/{realm}/vendorResources/CreateTideVendorKey", {
                    "licensingTier": "free", "email": config["TIDE_LICENSE_EMAIL"],
                }, token=token)
                # Documented lifecycle success marker; a generic 200 is NOT sufficient.
                success = status == 200 and body.strip().strip('"') == "CREATED"
                if success:
                    code = "CREATED"
                else:
                    try:
                        parsed = json.loads(body)
                        code = str(parsed.get("code", "UNCONFIRMED_RESPONSE")) if isinstance(parsed, dict) else "UNCONFIRMED_RESPONSE"
                    except (ValueError, TypeError):
                        code = "PAYMENT_REQUIRED" if "NEED_PAYMENT" in body or status == 303 else "UNCONFIRMED_RESPONSE"
        except (OSError, ValueError, urllib.error.URLError, TimeoutError):
            code = "NETWORK_OR_RESPONSE_ERROR"

        record = {"checkedAt": stamp, "attempt": attempt, "httpStatus": status,
                  "code": code, "licenseCreated": success, "realm": args.realm}
        target = setup / "license-watch-status.json"
        temporary = setup / "license-watch-status.tmp"
        temporary.write_text(json.dumps(record, indent=2) + "\n")
        temporary.replace(target)
        print(f"{stamp} attempt={attempt} HTTP={status} result={code}", flush=True)
        if success:
            print("LICENCE ACTIVATION SUCCEEDED: lifecycle returned CREATED. Watcher stopped. Resume bootstrap from preserved state; no IGA/users/adapter steps were run by this watcher.", flush=True)
            return 0
        if code in ("OPERATOR_AUTH_FAILED", "PAYMENT_REQUIRED") or status in (401, 403, 303):
            print("Watcher stopped: operator authorization or payment needs human attention. No automatic workaround.", flush=True)
            return 2
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        time.sleep(min(args.interval, remaining))
    print("Retry window ended without confirmed licence activation. Watcher stopped; realm preserved.", flush=True)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
