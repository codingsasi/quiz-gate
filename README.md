# Quiz Access
A simple node js website to run locally. Students login with email id and student id, and a password will be returned which should be used for the quiz brightspace. 

## Setup
Add the password in the `.env` file. See `.env.example` for the required variables.
Make sure a csv file exists with student details. First line should be column names.
Exmaple

```
email,student_id
asasidharan@algomau.ca,514xxxx
.
.
.
```

## Run

docker compose up --build

## Logs

Logs will show up in data/requests.jsonl. What's all captured:

```json
{
    time: "...",
    event: "password_issued",
    method: "POST",
    path: "/",
    status: 200,
    ip: "1.2.3.4",
    userAgent: "...",
    referer: null,
    origin: null,
    acceptLanguage: "en-CA",
    accept: "text/html",
    contentType: "application/x-www-form-urlencoded",
    contentLength: "42",
    fetchSite: "same-origin",
    fetchMode: "navigate",

    email: "bob@example.com",
    studentId: "12345"
}
```
