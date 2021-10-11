exports.handler = async function (event, context) {
    return {
        statusCode: 400,
        headers: {
            "www-authenticate": `Bearer realm="https://${event.headers.Host}/token",service="ghcr.io",scope="repository:beryju/acme-for-appliances:pull"`
        },
        body: JSON.stringify({})
    };
}
