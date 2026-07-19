import os

from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

# Initialize the client from an environment variable instead of storing a
# credential in source code.
api_token = os.environ.get("APIFY_API_TOKEN")
if not api_token:
    raise RuntimeError("Set the APIFY_API_TOKEN environment variable before running this script.")

client = ApifyClient(api_token)

# Prepare the Actor input
run_input = {
    "targetUrls": [
        "https://www.linkedin.com/in/patrick-stiller-ai/",
    ],
    "maxPosts": 10,
    "includeReposts": False,
    "maxComments": 10,
    "postNestedComments": True,
    "maxReactions": 10,
    "postNestedReactions": True,
}

# Run the Actor and wait for it to finish
run = client.actor("harvestapi/linkedin-profile-posts").call(run_input=run_input)

# call() returns None when the run does not finish successfully.
if run is None:
    raise RuntimeError(
        "The Apify Actor did not finish successfully. Check the Actor run logs in "
        "https://console.apify.com/actors/runs"
    )

dataset_id = run.default_dataset_id
if not dataset_id:
    raise RuntimeError(f"The Actor run returned no default dataset: {run!r}")

# Fetch and print Actor results from the run's dataset (if there are any)
items = [
    item
    for item in client.dataset(dataset_id).iterate_items()
    if not item.get("repostedBy")
]
if not items:
    raise RuntimeError(
        "The Actor succeeded but returned no posts. Verify the profile URL and "
        f"inspect the dataset: https://console.apify.com/storage/datasets/{dataset_id}"
    )

for item in items:
    print(item.get("content", ""))
    print()

# 📚 Want to learn more 📖? Go to → https://docs.apify.com/api/client/python/docs/quick-start
