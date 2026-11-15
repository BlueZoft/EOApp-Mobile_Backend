#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ -z "${MONGO_URI:-}" ]]; then
  # A project-specific container and port avoid changing other local databases.
  _eoapp_image=mongo@sha256:8b6d8f5bbedb25cb73517b65cf99f13aeb75ad5b157a56c479287a840bbad3ac
  _eoapp_container=eoapp-dev-mongo
  if docker container inspect "$_eoapp_container" >/dev/null 2>&1; then
    [[ $(docker inspect --format '{{.Config.Image}}' "$_eoapp_container") == "$_eoapp_image" ]] || {
      echo 'Existing eoapp-dev-mongo uses a different image; supply MONGO_URI or inspect the container.' >&2
      exit 1
    }
    docker start "$_eoapp_container" >/dev/null
  else
    docker run -d --name "$_eoapp_container" -p 127.0.0.1:27018:27017 \
      -v eoapp-dev-mongo-data:/data/db "$_eoapp_image" >/dev/null
  fi
  _eoapp_ready=false
  for _eoapp_attempt in {1..30}; do
    if docker exec "$_eoapp_container" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok === 1 ? 0 : 1)' >/dev/null 2>&1; then
      _eoapp_ready=true
      break
    fi
    sleep 1
  done
  [[ "$_eoapp_ready" == true ]] || { echo 'Development MongoDB did not become ready.' >&2; exit 1; }
  export MONGO_URI=mongodb://127.0.0.1:27018/eoapp
fi
# Import remains explicit; do not modify data just because a development server starts.
exec npm start
