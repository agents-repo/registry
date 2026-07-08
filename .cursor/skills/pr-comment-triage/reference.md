# PR comment triage — reference

## List unresolved review threads

```bash
gh api graphql -f query='...' \
  -f owner=OWNER -f name=REPO -F number=PR \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved==false)
    | {id, path, line, author: .comments.nodes[0].author.login}'
```

Full query shape:

```graphql
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
          line
          comments(first: 1) {
            nodes { body author { login } }
          }
        }
      }
    }
  }
}
```

Replace `OWNER`, `REPO`, `PR` (e.g. `agents-repo`, `registry`, `65`).

## Count unresolved threads

```bash
gh api graphql -f query='...' \
  -f owner=OWNER -f name=REPO -F number=PR \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved==false)] | length'
```

If the count is `100`, paginate with `reviewThreads(first: 100, after: "CURSOR")`.

## REST inline comments (supplemental)

```bash
gh api repos/OWNER/REPO/pulls/PR/comments \
  --jq '.[] | {id, path, line, user: .user.login}'
```

Do not use REST `pulls/comments/{id}/replies` for thread closure.
Use GraphQL thread IDs (`PRRT_...`).

## Reply to a thread

```bash
gh api graphql -f query='
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId
      body: $body
    }) {
      comment { id }
    }
  }' -f threadId="PRRT_..." -f body="Fixed in abc1234: summary."
```

## Resolve a thread

Run **after** the reply mutation, in a separate call:

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }' -f threadId="PRRT_..." \
  --jq '.data.resolveReviewThread.thread.isResolved'
```

## Review summary

```bash
gh pr view PR --repo OWNER/REPO --comments
```

## Example triage outcomes

| Comment theme | Outcome | Notes |
| --- | --- | --- |
| Markdown list structure broken | `needs_fix` | Indent list continuation |
| Inherited health file absolute URL | `wont_fix` | Split link strategy |
| Issue template omits `Closes #` | `by_design` | `Closes #` belongs in PR |
| README missing CONTRIBUTING link | `needs_fix` | Add relative link |
| Bugbot finding invalid | `wont_fix` | Reply with rationale |

## Sandbox

`gh api` may require `full_network` or `all` permissions in restricted environments.
