import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient();

export const handler = async (event) => {
  const body = JSON.parse(event.body);

  const input = {
    repo: body.repo,
    commit_sha: body.commit_sha,
    platform: body.platform,
    branch: body.branch,
    env: body.env
  };

  const release_id = `${body.env}-${body.repo}-${body.platform}-${Date.now()}`;

  await db.send(new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
      release_id: { S: release_id },
      repo: { S: body.repo },
      commit_sha: { S: body.commit_sha },
      platform: { S: body.platform },
      branch: { S: body.branch },
      env: { S: body.env },
      change_request_id: { S: "" },
      pr_number: { S: "" },
      status: { S: "NEW" }
    }
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ release_id })
  };
};