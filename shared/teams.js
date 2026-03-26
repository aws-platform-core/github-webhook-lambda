import axios from "axios";

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
        "themeColor": "0076D7",
        "title": "Deployment Status",
        "text": "<p><b>[STARTED]</b></p> <b>Release Id:</b> 1234, <b>Initiated by:</b> kiran, <b>Time (UTC):</b>10:00 AM</u>",
        "potentialAction": [{
            "@type": "OpenUri",
            "name": "View Run",
            "targets": [
                {
                    "os": "default",
                    "uri": "http://www.google.com"
                }
            ]
        }],
        "sections": [
            {
                "activityTitle": "<b>Pipeline Metadata</b>",
                "facts": [
                    {
                        "name": "<u><b>Workflow :</b></u>",
                        "value": "portal-glow"
                    },
                    {
                        "name": "Run :",
                        "value": "main"
                    },
                    {
                        "name": "Actor :",
                        "value": "Success"
                    }
                ]
            },
            {
                "activityTitle": "Job Results",
                "facts": [
                    {
                        "name": "get-image-tag :",
                        "value": "Success"
                    },
                    {
                        "name": "build-and-push-docker-image",
                        "value": "Success"
                    },
                    {
                        "name": "trigger-chart-tagger",
                        "value": "Success"
                    },
                    {
                        "name": "port-logs",
                        "value": "Success"
                    }
                ]
            }
        ]
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
