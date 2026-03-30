import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: process.env.REGION });

export const handler = async (event) => {
    console.log("Received event: ", JSON.stringify(event));

    await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: event.body
    }));

    return {
        statusCode: 200,
        body: "Success"
    };
}
