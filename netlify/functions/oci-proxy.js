const config = {
    namespace: "",
    // Settings for GHCR
    // registry: "ghcr.io",
    // registryTokenEndpoint: "ghcr.io/token"
    // registryService: "ghcr.io",
    // Settings for Harbor
    registry: "docker.beryju.org",
    registryTokenEndpoint: "docker.beryju.org/service/token",
    registryService: "harbor-registry",
};

async function getToken(event) {
    const fetch = await import('node-fetch');
    const upstreamScope = event.queryStringParameters["scope"];
    const repo = upstreamScope.split(":")[1];
    const scope = `repository:${config.namespace}${repo}:pull`;
    console.debug(`oci-proxy: getting token with scope ${scope}`);
    const tokenRes = await fetch.default(`https://${config.registryTokenEndpoint}?service=${config.registry}&scope=${scope}`);
    return {
        statusCode: tokenRes.status,
        body: await tokenRes.text()
    };
}

exports.handler = async function (event, context) {
    if (event.queryStringParameters.hasOwnProperty("token")) {
        console.debug("oci-proxy: token proxy");
        return await getToken(event);
    }
    console.debug("oci-proxy: root handler, returning 401 with www-authenticate");
    return {
        statusCode: 401,
        headers: {
            "www-authenticate": `Bearer realm="https://${event.headers.host}/v2?token",service="${event.headers.host}",scope="repository:user/image:pull"`,
            "Docker-Distribution-API-Version": "registry/2.0",
            "content-type": "application/json",
        },
        body: JSON.stringify({})
    };
}
