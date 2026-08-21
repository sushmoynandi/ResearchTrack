# Git Workflow — ResearchTrack

How we work together on this project without stepping on each other.

**The one rule:** never work directly on `master`. Make a branch, work there, merge it back.

---

## First time only — set up your machine

```bash
git clone https://github.com/sushmoynandi/ResearchTrack.git
cd ResearchTrack
npm install
```

Then two things git can't do for you:

1. **Get a `.env` file** from someone on the team. It holds database and Google
   keys, so it is deliberately kept out of git. Without it the app won't start.
2. **Create your database tables:**
   ```bash
   npx prisma db push
   npm run seed        # optional: adds demo accounts to play with
   ```

Start the app:

```bash
npm run dev           # http://localhost:3000
```

---

## Every time you start a new piece of work

```bash
git checkout master          # go to the main branch
git pull origin master       # get everyone else's latest work
git checkout -b your-name/what-youre-doing
```

**Branch names.** Put your name first so everyone can see whose branch it is:

```
nazmul/forgot-password
sushmoy/fix-login-button
nazmul/paper-export
```

Use dashes, no spaces, all lowercase.

---

## While you work

Commit early and often — small commits are easier to undo than one huge one.

```bash
git status                   # what have I changed?
git diff                     # show me the actual changes
git add .                    # stage everything
git commit -m "Add forgot password page"
```

Push your branch so it's backed up and others can see it:

```bash
git push origin your-name/what-youre-doing
```

After the first push, `git push` on its own is enough.

### Write commit messages someone else can read

| Good | Not so good |
|---|---|
| `Add forgot password page` | `update` |
| `Fix Google login on live site` | `fix bug` |
| `Make profile photo croppable` | `changes` |

Say **what changed**, not "changes".

---

## Keep your branch fresh

If your branch has been open for a few days, pull in what others have merged.
Doing this often means small, easy conflicts instead of one big painful one.

```bash
git checkout master
git pull origin master
git checkout your-branch
git merge master
```

---

## When your work is done — merge into master

### Option A: Pull Request (best for a team)

```bash
git push origin your-branch
```

Then on GitHub: **Compare & pull request** → write a short description → let a
teammate look at it → **Merge pull request**.

Afterwards, everyone updates:

```bash
git checkout master
git pull origin master
```

**Why bother:** someone else reads your code before it goes in, and there's a
record of why every change happened.

### Option B: Merge yourself (fine for solo work)

```bash
git checkout master
git pull origin master        # important — don't skip
git merge your-branch
git push origin master
git checkout your-branch      # back to where you were
```

### Delete the branch once it's merged

```bash
git branch -d your-branch                # delete locally
git push origin --delete your-branch     # delete on GitHub
```

---

## If you changed the database

This project has **no migration files** — the schema lives in
`prisma/schema.prisma` and is applied with `db push`.

**You changed `prisma/schema.prisma`:**

```bash
npx prisma db push        # apply it to your own database
git add prisma/schema.prisma
git commit -m "Add role change request table"
```

**Someone else changed it and you just pulled:**

```bash
npx prisma db push        # your database is now out of date — run this
```

⚠️ **Tell the team in chat when you change the schema.** Otherwise their app
crashes with errors about a table that doesn't exist, and nobody knows why.

Adding a new table or an optional column is safe. Renaming or deleting a column
throws away real data — talk to the team before doing that.

---

## Merge conflicts

A conflict means two people edited the same lines. Git can't guess who's right,
so it asks you.

```bash
git merge master
# CONFLICT (content): Merge conflict in app/page.tsx
```

Open the file. You'll see:

```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> master
```

Delete the `<<<<<<<`, `=======` and `>>>>>>>` lines and leave the code you
actually want — sometimes yours, sometimes theirs, sometimes a mix. Then:

```bash
git add the-file.tsx
git commit
```

Panicking? Back out and start over:

```bash
git merge --abort
```

---

## When something goes wrong

| Situation | Command |
|---|---|
| Undo changes to one file (not committed yet) | `git checkout -- path/to/file` |
| Undo **all** uncommitted changes | `git reset --hard` ⚠️ can't be undone |
| Committed but not pushed — fix the message | `git commit --amend -m "Better message"` |
| Committed but not pushed — undo, keep the changes | `git reset --soft HEAD~1` |
| Working on the wrong branch (not committed) | `git stash` → `git checkout right-branch` → `git stash pop` |
| See what happened recently | `git log --oneline -10` |
| See who wrote a line and why | `git log -p path/to/file` |

---

## Things that cause trouble

- **Committing straight to `master`.** Someone pulls a broken app and can't work.
- **Committing `.env`.** It has database passwords and Google secrets in it. It's
  in `.gitignore` — leave it there.
- **`git push --force`.** It deletes other people's commits. If you think you need
  it, ask first.
- **Branches left open for weeks.** The longer it sits, the worse the conflict.
- **Pulling and not running `npx prisma db push`** after someone changed the schema.

---

## Cheat sheet

```bash
# start something new
git checkout master && git pull origin master
git checkout -b nazmul/my-feature

# while working
git status
git add .
git commit -m "Clear description of what changed"
git push origin nazmul/my-feature

# finish
git checkout master && git pull origin master
git merge nazmul/my-feature
git push origin master
git branch -d nazmul/my-feature
```
