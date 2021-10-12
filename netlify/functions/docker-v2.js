const config = {
    namespace: "beryju/",
    registry: "ghcr.io",
    registryTokenEndpoint: "ghcr.io/token"
};

async function getToken(event) {
    const fetch = await import('node-fetch');
    const upstreamScope = event.queryStringParameters["scope"];
    const repo = upstreamScope.split(":");
    const scope = `repository:${config.namespace}${repo}:pull`;
    const tokenRes = await fetch.default(`https://${config.registryTokenEndpoint}?service=${config.registry}&scope=${scope}`);
    return {
        statusCode: 200,
        body: await tokenRes.text()
    };
}

exports.handler = async function (event, context) {
    if (event.queryStringParameters.hasOwnProperty("token")) {
        return await getToken(event);
    }
    console.log(event);
    console.log(context);
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
