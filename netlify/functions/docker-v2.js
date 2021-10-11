exports.handler = async function (event, context) {
    console.log(event.httpMethod);
    if (event.httpMethod !== "HEAD") {
        return {
            statusCode: 400,
            body: JSON.stringify({})
        };
    }
    return {
        statusCode: 200,
        headers: {
            "www-authenticate": `Bearer realm="https://${event.headers.host}/token",service="${event.headers.host}",scope="repository:beryju/acme-for-appliances:pull"`
        },
        body: JSON.stringify({})
    };
}
