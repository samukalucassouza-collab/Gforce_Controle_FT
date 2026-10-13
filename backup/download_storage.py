"""Exporta objetos privados do Supabase Storage sem registrar nomes de documentos nos logs."""
import hashlib
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

destination = pathlib.Path(sys.argv[1])
bucket = "controle-ft"
base = os.environ["SUPABASE_URL"].rstrip("/")
token = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": token, "Authorization": "Bearer " + token}
out = destination / "storage"
out.mkdir(parents=True, exist_ok=True)
manifest = []
seen = set()


def request(path, data=None):
    h = dict(headers)
    if data is not None:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(base + path, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def traverse(prefix=""):
    offset = 0
    while True:
        body = json.dumps({"prefix": prefix, "limit": 100, "offset": offset}).encode()
        entries = json.loads(request("/storage/v1/object/list/" + bucket, body))
        if not isinstance(entries, list):
            raise RuntimeError("Resposta inesperada na listagem de Storage")
        for entry in entries:
            name = entry["name"]
            key = prefix + name
            if entry.get("id") is None:
                traverse(key + "/")
                continue
            if key in seen:
                raise RuntimeError("Objeto duplicado na listagem")
            seen.add(key)
            relative = pathlib.PurePosixPath(key)
            if key.startswith("/") or ".." in relative.parts:
                raise RuntimeError("Caminho inseguro no Storage")
            data = request("/storage/v1/object/authenticated/" + bucket + "/" + urllib.parse.quote(key, safe="/"))
            path = out.joinpath(*relative.parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            manifest.append({"path": key, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        if len(entries) < 100:
            break
        offset += len(entries)


traverse()
if not manifest:
    raise RuntimeError("Storage vazio: interrompendo backup para revisão")
if len(manifest) != len(seen):
    raise RuntimeError("Contagem de objetos divergente")
(destination / "manifest.json").write_text(
    json.dumps({"bucket": bucket, "count": len(manifest), "objects": manifest}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print("Objetos copiados e verificados localmente:", len(manifest))
