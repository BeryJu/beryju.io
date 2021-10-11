exports.handler = async function (event, context) {
    console.log(event);
    console.log(context);
    return {
        statusCode: 200,
        headers: {
            "www-authenticate": `Bearer realm="https://${event.headers.host}/token",service="${event.headers.host}",scope="repository:beryju/acme-for-appliances:pull"`,
            "Docker-Distribution-API-Version": "registry/2.0",
            "content-type": "application/json",
        },
        body: JSON.stringify({})
    };
}
