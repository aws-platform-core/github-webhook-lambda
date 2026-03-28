import axios from "axios";
import { ACTION_TYPE, COLORS, convertUTCToLocalTime } from "./util.js";

export const sendTeamsNotification = async (payload, record, teamsWebhookUrl, isStart = true) => {
    console.log("Sending Teams notification with record: ");
    // const body = {
    //     text: `New workflow run event: ${record.workflow} - ${record.status}`,
    //     attachments: [
    //         {
    //             title: "Workflow Details",
    //             fields: [
    //                 { name: "Repository", value: record.repo, inline: true },
    //                 { name: "Run ID", value: record.run_id, inline: true },
    //                 { name: "Release ID", value: record.release_id, inline: true },
    //                 { name: "Triggered By", value: record.actor, inline: true },
    //             ],
    //         },
    //     ],
    // };

    const body = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "Build Notification",
        // "themeColor": getColor(payload),
        "title": `${getPreText(getColor(payload))} ${getTitle(payload)}`,
        "text": `<div style="font-family:Segoe UI, sans-serif; font-size:14px; border-top:solid 10px #${getColor(payload)}; padding:5px; border-radius:0px;">
                    <h2 style="color:#0078D4; margin-bottom:10px;"><u>Release Information</u></h2>
                    
                    <table>
                      <tr>
                        <td><b>Service Repository :</b></td>
                        <td>${record.repo}</td>
                      </tr>
                      <tr>
                        <td><b>Environment :</b></td>
                        <td>${record.env}</td>
                      </tr>
                      <tr>
                        <td><b>Release ID :</b></td>
                        <td>${record.release_id}</td>
                      </tr>
                      <tr>
                        <td><b>Triggered By :</b></td>
                        <td>${record.actor}</td>
                      </tr>
                      <tr>
                        <td><b>Workflow :</b></td>
                        <td>${payload.workflow_run.name}</td>
                      </tr>
                      <tr>
                        <td><b>Branch :</b></td>
                        <td>${payload.workflow_run.head_branch}</td>
                      </tr>
                      ${!isStart ?
                      `<tr>
                        <td><b>Duration (s) :</b></td>
                        <td>${record.duration}</td>
                      </tr>` : ""}
                    </table>
                    ${(record.jobs?.length && !isStart) ? 
                        `<h2 style="color:#0078D4; margin-top:20px;"><u>Job Summary</u></h2>
                        <div style="padding:5px; border-radius:5px;">
                            <ul>
                                ${record.jobs.map(job => `<li><b>${job.name}:</b> ${job.conclusion === "success" ? "✅ Success" : 
                                    job.conclusion === "failure" ? "❌ Failure" : 
                                        job.conclusion === "cancelled" ? 
                                            "🛑 Cancelled" : job.conclusion}</li>`).join("")}
                            </ul>
                        </div>` : ""}  
                     ${(!!record.diff && !isStart) ? 
                        `<h2 style="color:#0078D4; margin-top:20px;"><u>Diff Summary</u></h2>
                        <div style="padding:5px; border-radius:5px;">
                            <ul>
                                ${record.diff.split(",").map(line => `<li>${line}</li>`).join("")}
                            </ul>
                        </div>` : ""}  
                    <span style="height:10px; display:block;"></span>               
                    <hr></hr>
                    <div style="color:gray; font-size:12px;">
                        Started at: <b>${convertUTCToLocalTime(record.started_at, "Europe/Amsterdam")}</b>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        ${!isStart ? `Completed at: <b>${convertUTCToLocalTime(record.completed_at, "Europe/Amsterdam")}</b>` : ""}
                    </div>
                </div>`,
        "potentialAction": [{
            "@type": "OpenUri",
            "name": "View Run",
            "targets": [{
                    "os": "default",
                    "uri": `${record.workflow_url}`
                }
            ]
        },
        {
            "@type": "OpenUri",
            "name": "View Logs",
            "targets": [{
                    "os": "default",
                    "uri": `${record.logs_url}`
                }
            ]
        },
        {
            "@type": "OpenUri",
            "name": "View Deployment Status",
            "targets": [{
                    "os": "default",
                    "uri": `https://eddc60f442084189a14ff71e0fe49f36.eu-central-1.aws.cloud.es.io/s/sre/app/dashboards#/view/63b96f92-3d4b-4bb4-a497-11d8d00cd74d?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:''2026-02-26T00:00:00.802Z'',to:now))&_a=(query:(language:kuery,query:''release_id:"${ record.release_id}"''))`
                }
            ]
        }],
        // "sections": [
        //     {
        //         "activityTitle": "<b>Pipeline Metadata</b>",
        //         "facts": [
        //             {
        //                 "name": "<u><b>Workflow :</b></u>",
        //                 "value": "portal-glow"
        //             },
        //             {
        //                 "name": "Run :",
        //                 "value": "main"
        //             },
        //             {
        //                 "name": "Actor :",
        //                 "value": "Success"
        //             }
        //         ]
        //     },
        //     {
        //         "activityTitle": "Job Results",
        //         "facts": [
        //             {
        //                 "name": "get-image-tag :",
        //                 "value": "Success"
        //             },
        //             {
        //                 "name": "build-and-push-docker-image",
        //                 "value": "Success"
        //             },
        //             {
        //                 "name": "trigger-chart-tagger",
        //                 "value": "Success"
        //             },
        //             {
        //                 "name": "port-logs",
        //                 "value": "Success"
        //             }
        //         ]
        //     }
        // ]
    }

    try {
        const response = await axios.post(teamsWebhookUrl, JSON.stringify(body), {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.status !== 202) {
            throw new Error(`Failed to send Teams notification: ${response}`);
        }

        console.log("Teams notification sent successfully");
    } catch (error) {
        console.error("Error sending Teams notification: ", error);
    }
};

const getTitle = (payload) => {
    
    if (payload.action === ACTION_TYPE.REQUESTED) {
        return `🚀 Deployment started - ${payload.workflow_run.repository.full_name}`;
    } else if (payload.action === ACTION_TYPE.COMPLETED) {
        if (payload.workflow_run.conclusion === "success") {
            return `✅ Deployment succeeded - ${payload.workflow_run.repository.full_name}`;
        } else if (payload.workflow_run.conclusion === "failure") {
            return `❌ Deployment failed - ${payload.workflow_run.repository.full_name}`;
        } else if (payload.workflow_run.conclusion === "cancelled") {
            return `🛑 Deployment cancelled - ${payload.workflow_run.repository.full_name}`;
        }
    }
};

const getColor = (payload) => {
    if (payload.action === ACTION_TYPE.REQUESTED) {
        return COLORS.STARTED;
    } else if (payload.action === ACTION_TYPE.COMPLETED) {
        if (payload.workflow_run.conclusion === "success") {
            return COLORS.SUCCESS;
        } else if (payload.workflow_run.conclusion === "failure") {
            return COLORS.FAILURE;
        } else if (payload.workflow_run.conclusion === "cancelled") {
            return COLORS.CANCELLED;
        }
    }
};

const getPreText = (color) => {
    return `<label style="color: #${color}; font-weight: bold;">[${Object.keys(COLORS).find(key => COLORS[key] === color)}]</label>`;
}
