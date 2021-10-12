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
    let scope = event.queryStringParameters["scope"];
    let tokenUrl = `https://${config.registryTokenEndpoint}?service=${config.registryService}`;
    if (scope && scope.includes(":")) {
        const repo = scope.split(":")[1];
        console.debug(`oci-proxy: original scope: ${scope}`);
        scope = `repository:${config.namespace}${repo}:pull`;
        console.debug(`oci-proxy: rewritten scope: ${scope}`);
        tokenUrl += `&scope=${scope}`;
    } else {
        console.debug(`oci-proxy: no scope`);
    }
    console.debug(`oci-proxy: final URL to fetch: ${tokenUrl}`)
    const tokenRes = await fetch.default(tokenUrl);
    return {
        statusCode: tokenRes.status,
        body: await tokenRes.text()
    };
}

exports.handler = async function (event, context) {
    console.debug(`oci-proxy: URL ${event.httpMethod} ${event.rawUrl}`);
    if (event.queryStringParameters.hasOwnProperty("token")) {
        console.debug("oci-proxy: handler=token proxy");
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
