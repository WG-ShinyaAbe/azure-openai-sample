"use strict";
const {Configuration, OpenAIApi} = require("azure-openai");

/**
 * AWS Lambda用Function
 * @param event API GatewayからPOSTしたデータを受信します。body内のtext項目が必須です。
 * @returns {Promise<{body: string, statusCode: number}>}
 */
module.exports.openai = async (event) => {
    const crypto = require('crypto');
    const sharedSecret = process.env.SHARED_SECRET;
    const bufSecret = Buffer.from(sharedSecret, "base64");
    const auth = event.headers['Authorization'];
    const msgBuf = Buffer.from(event.body, 'utf8');
    const msgHash = "HMAC " + crypto.createHmac('sha256', bufSecret).update(msgBuf).digest("base64");

    // HMACが一致しない場合はbad requestを投げる
    if (msgHash !== auth) {
        return {
            statusCode: 400,
            body: JSON.stringify(
                {
                    type: "message",
                    text: "Bad Request",
                },
                null,
                2
            ),
        };
    }
    // HMACが一致している場合は後続処理続行
    const openAiApi = new OpenAIApi(
        new Configuration({
            apiKey: this.apiKey,
            // add azure info into configuration
            azure: {
                apiKey: process.env.OPENAI_API_KEY,
                endpoint: process.env.OPENAI_ENDPOINT,
                deploymentName: process.env.DEPLOYMENT_NAME,
            }
        }),
    );
    let responseData = ""
    const body = JSON.parse(event.body)
    if (body.text) {
        const completion = await openAiApi.createCompletion({
            max_tokens: 500,
            // メンション削除。ベタ書きなので、要修正
            prompt: body.text.replaceAll("<at>openai</at>", ""),
        });
        responseData = completion.data.choices[0].text
    }
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                type: "message",
                text: responseData,
            },
            null,
            2
        ),
    };
};
