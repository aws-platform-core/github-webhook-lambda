import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from "@aws-sdk/client-sfn";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";

const sfn = new SFNClient();
const db = new DynamoDBClient();

export const handler = async (event) => {
  console.log(`Received event `, event);
  // If it's an API Gateway request, the payload will be in event.body as a string, otherwise it's a direct invocation with the payload in event.
  const body = event.body ? JSON.parse(event.body) : event; 
  
  console.log(`Received event ${body?.origin ? body?.origin : ''}: `, body);

  // TODO: Assuming service now return a response with release_id in the outbound webhook request body,
  // State machine originated response always do. We should add some validation here to make sure we have the release_id before we query the database. 
  if (!body.release_id) {
    console.error("No release_id found in request body");
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request" }) };
  }

  const release = await db.send(new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Key: { release_id: { S: body.release_id } }
  }));

  if (!release.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Release not found" })
    };
  }

  if (body?.origin !== "state-machine") { // Outbound webhook request.
    body.approved = body.approved === "true";
    await updateReleaseStatus(release.Item, body.approved, body?.change_request_id);
    await sendResponseToStateMachine(release.Item.release_id.S, release.Item.taskToken.S, body.approved);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Release ${body.approved ? "approved" : "rejected"}!` })
    };
  } else {
    updateReleaseStatus({ ...release.Item, taskToken: {S: body.taskToken} }, null, body?.change_request_id ?? null); 
  } 

  return { statusCode: 200 };
};

const sendResponseToStateMachine = async (release_id, taskToken, approved) => {
  if (approved) {
    await sfn.send(new SendTaskSuccessCommand({
      taskToken: taskToken,
      output: JSON.stringify({ release_id, approved: true })
    }));
  } else {
    await sfn.send(new SendTaskFailureCommand({
      taskToken: taskToken,
      output: JSON.stringify({ release_id, approved: false })
    }));
  }
};

const updateReleaseStatus = async (release, approved, change_request_id) => {
  console.log("Release from DB == ", release);
  console.log("Approved == ", approved);
  console.log("Change request id == ", change_request_id);
  const tuple = {
    ...release,
    change_request_id: { S: change_request_id ?? "" },
    status: { S: approved === null ? "AWAITING_APPROVAL" : (approved ? "APPROVED" : "REJECTED") }
  }
  console.log('Tuple == ', tuple);
  await db.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
     ...tuple
    }
  }));
};
