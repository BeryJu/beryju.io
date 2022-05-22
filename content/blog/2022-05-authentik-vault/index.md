---
title: 'Integrating authentik tokens with Hashicorp Vault'
date: '2022-05-06'
taxonomy:
    category:
        - blog
    tag:
        - authentik
        - vault
        - python
        - sso
    author:
        - jens
---
Recently, as I've been implementing authentik for more of my services, I was looking for a way to get tokens from authentik into some other systems to, for example, deploy them on machines with Puppet. Because authentik doesn't (yet) support certificate authentication, and I already have Hashicorp Vault setup for that, I wondered if I could build an integration that syncs tokens into vault.

Turns out, this is actually pretty simple. Create a new Expression policy with the following code in authentik:

```python
# Adjust this for your vault setup
vault_host = "https://vault.beryju.org"
vault_auth_path = "auth/k8s-prd"
vault_kv_store = "kv"
vault_kv_prefix = "authentik"

model_actions = [
    "model_updated",
    "model_created",
]
model_app = "authentik_core"
model_name = "token"

from authentik.core.models import Token

event = request.context.get("event", None)
if not event:
    ak_logger.info("vault_write: No event")
    return False
if event.action not in model_actions:
    ak_logger.info("vault_write: Non-matching action")
    return False
if (
    event.context["model"]["app"] != model_app
    or event.context["model"]["model_name"] != model_name
):
    ak_logger.info("vault_write: Invalid model")
    return False

token = Token.objects.filter(token_uuid=event.context["model"]["pk"]).first()
if not token:
    ak_logger.info("vault_write: Token doesn't exist anymore")
    return False

# Vault login
with open(
    "/var/run/secrets/kubernetes.io/serviceaccount/token", "r", encoding="utf-8"
) as _token:
    k8s_token = _token.read()
auth = requests.post(
    f"{vault_host}/v1/{vault_auth_path}/login",
    json={
        "jwt": k8s_token,
        "role": "authentik",
    },
)
auth.raise_for_status()
vault_token = auth.json()["auth"]["client_token"]
ak_logger.info("vault_write: Got vault token")

response = requests.post(
    f"{vault_host}/v1/{vault_kv_store}/data/{vault_kv_prefix}/{token.identifier}",
    json={
        "data": {
            "key": token.key,
            "intent": token.intent,
        }
    },
    headers={
        "X-Vault-Token": vault_token,
    },
)
ak_logger.info(response.json())

return False
```

Afterwards, create an empty group and an Event rule, which sends to the freshly created group.

Bind this policy to it and that's pretty much it.

Now, this policy assumes that you're running authentik in Kubernetes, and that you have Kubernetes authentication in vault configured.

Additionally you'll need to create some custom RBAC to allow the Kubernetes JWTs to use the [TokenReview](https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/) API:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: authentik-token-reviews
rules:
- apiGroups:
  - authentication.k8s.io
  resources:
  - tokenreviews
  verbs:
  - create
- apiGroups:
  - authorization.k8s.io
  resources:
  - subjectaccessreviews
  verbs:
  - create
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: authentik-token-reviews
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: authentik-token-reviews
subjects:
- kind: ServiceAccount
  name: authentik
  namespace: authentik
```

Once this is all configured, any saved token will appear in Vault. This also pushes automatic rotations from authentik into Vault.
