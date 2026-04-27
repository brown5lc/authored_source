# Authored: Final Design Report

**Team Name:** Authored  
**Team Member:** Liam Brown  
**Course:** CS5002 Senior Design  
**Repository:** https://github.com/brown5lc/authored_source  
**Supporting Documentation Repository:** https://github.com/brown5lc/authored  

## Table of Contents

1. [Project Description](#1-project-description)
2. [User Interface Specification](#2-user-interface-specification)
3. [Test Plan and Results](#3-test-plan-and-results)
4. [User Manual](#4-user-manual)
5. [Spring Final PPT Presentation](#5-spring-final-ppt-presentation)
6. [Final Expo Poster](#6-final-expo-poster)
7. [Assessments](#7-assessments)
8. [Summary of Hours and Justification](#8-summary-of-hours-and-justification)
9. [Summary of Expenses](#9-summary-of-expenses)
10. [Appendix](#10-appendix)

---

## 1. Project Description

### Abstract

Authored is a lightweight web-based IDE for university programming courses. It lets students complete Python assignments in the browser while instructors create assignments, review submissions, and inspect an activity timeline that flags copy, paste, page-leaving, and other suspicious workflow patterns.

### Final Project Description

Authored is a browser-based programming environment designed for computer science education in the age of AI. The goal of the project is to give students a simple place to complete programming assignments while giving instructors better tools for assignment creation, review, grading, and academic integrity analysis.

The final version of the project runs locally and includes a web-based coding environment built around the Monaco editor. Students can open an assignment, read the prompt, write Python code, run it directly in the browser using Pyodide, and submit their work. While the student works, Authored logs activity such as edits, copy events, paste events, code runs, submissions, and page focus changes.

On the instructor side, Authored supports assignment creation and review. A professor or TA can create assignments with starter code, prompts, points, test cases, and tutor permissions. After a student submits, the professor or TA can view a timeline of the student’s work session. The timeline includes playback-style review, code snapshots, event markers, and a misconduct/risk analysis panel that flags suspicious behavior such as large pastes, repeated page leaving, or unusually fast code growth.

The project is not a fully deployed production system, but it demonstrates the main idea through a working local prototype. The final result shows the core Authored workflow: professor assignment creation, student assignment completion, and professor/TA submission review.

### Project Goals

The main goals of Authored were:

- Make programming assignments easier to access by running code in the browser.
- Reduce environment setup problems for beginning programming students.
- Provide instructors with more visibility into how student code was created.
- Encourage responsible AI use instead of pretending AI tools do not exist.
- Create a lightweight academic tool focused on education, not just code editing.

### Final Status

The final prototype successfully demonstrates the main planned workflow:

- Student and professor/TA style views.
- Class and assignment navigation.
- Assignment creation and editing.
- Monaco-based coding environment.
- Browser-based Python execution with Pyodide.
- Student activity logging.
- Submission storage through the backend.
- Timeline-based review of student activity.
- Automatic suspicious activity/risk flagging.
- Manual grading and instructor comments.

The main limitation is that the system currently runs locally and is not deployed as a hosted application.

---

## 2. User Interface Specification

Authored uses a web interface with a top navigation bar, a side drawer, and page-based routing. The interface is designed around the normal flow of a programming course: a professor creates an assignment, a student completes the assignment, and a professor or TA reviews the submission.

### Main Screens

#### Homepage / Dashboard

The homepage acts as the starting point for the user. It provides access to course-related pages and gives the user a central place to navigate through the system.

**Screenshot:**  
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/958d43a1-d29b-40f3-ae0e-b2cbe9ec69f1" />

#### Class Page

The class page shows assignments and class-specific information. A student can use this page to find assignments, while a professor or TA can use it to access assignment management and review tools.

**Screenshot:**  
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/bf2b10e1-206b-4b87-9bc2-abf58e79e55e" />
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/47b06c6f-aab3-4c65-a2d5-4c23700c7bbf" />

#### Create Assignment Page

The Create Assignment page lets an instructor create or edit a programming assignment. It includes fields for assignment title, prompt, starter code, due date, points, test cases, and whether the AI tutor is allowed.

**Screenshot:**  
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/3259007a-de72-4afa-8d99-f57fc9a44fcb" />

#### Assignment IDE

The Assignment IDE is the main student coding environment. It includes the assignment prompt, Monaco code editor, run button, output panel, submit button, and optional AI tutor panel. Python code runs in the browser using Pyodide, so the student can test their work without needing a local Python installation.

**Screenshot:**  
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/95600a3e-b6e2-40de-ab21-d81a99bbb62e" />

#### Timeline Review Page

The Timeline page is the main instructor/TA review tool. It shows the student’s activity history, code snapshots, event markers, code growth, suspicious activity analysis, and grading fields. The goal is not to automatically accuse a student of cheating, but to give instructors better context when reviewing submissions.

**Screenshot:**  
<img width="1490" height="880" alt="image" src="https://github.com/user-attachments/assets/5bc48b2d-c6de-4c96-9111-80db548220ec" />

### Basic User Flow

1. Professor creates an assignment.
2. Student opens the assignment.
3. Student writes and runs Python code in the browser.
4. Authored logs activity during the session.
5. Student submits the assignment.
6. Professor or TA opens the student timeline.
7. Professor or TA reviews the code, timeline, risk flags, and submission.
8. Professor or TA enters a grade and comments.

---

## 3. Test Plan and Results

Testing was done manually by walking through the main flows that the project is supposed to support. Since Authored is a prototype, the testing focused on whether the main workflow worked clearly enough for the final demo and expo presentation.

| Test | Expected Result | Actual Result | Status |
|---|---|---|---|
| Open the local frontend | App loads in the browser | App loaded successfully | Pass |
| Navigate from homepage to class/assignment pages | User can move through the main app pages | Navigation worked through the main routes | Pass |
| Create a new assignment as professor/TA | Assignment form saves assignment data | Assignment creation flow worked locally | Pass |
| Open an assignment as a student | Assignment prompt and starter code appear | Assignment loaded in the IDE | Pass |
| Type code into Monaco editor | Student can edit code in allowed area | Code editing worked | Pass |
| Run valid Python code | Output appears in the output panel | Python ran in the browser through Pyodide | Pass |
| Run invalid Python code | Error appears without crashing the whole app | Error output was shown | Pass |
| Copy code while working | Copy event is logged | Copy events appeared in tracking data | Pass |
| Paste code into the editor | Paste event is logged and flagged | Paste events appeared on the timeline | Pass |
| Leave the assignment page/tab | Focus lost/focus gained events are logged | Page leaving was tracked | Pass |
| Submit assignment | Submission and activity data are saved | Submission flow worked locally | Pass |
| Open student timeline as professor/TA | Timeline shows activity events and code snapshots | Timeline review page displayed session data | Pass |
| Review suspicious activity flags | Suspicious behavior is summarized for instructor | Risk panel identified issues like paste and leaving page | Pass |
| Enter grade/comments | Instructor can save evaluation feedback | Manual grading flow worked locally | Pass |

### Testing Summary

The main professor, student, and professor/TA review flows were tested manually. The strongest part of the prototype is that the full concept can be demonstrated from end to end: creating an assignment, completing it as a student, submitting it, and reviewing the timeline afterward. The main limitation is that testing was not automated and the app is still a local prototype, so more formal testing would be needed before real classroom use.

---

## 4. User Manual

### Running the Project Locally

Authored has two main parts:

- `authored_frontend`
- `authored_backend`

#### Frontend

```bash
cd authored_frontend
npm install
npm run dev
```

Then open the local Vite development URL in the browser.

#### Backend

```bash
cd authored_backend
npm install
npm run dev
```

The backend must be running for assignment and submission data to be available through the local API.

### Professor / TA Instructions

1. Start the frontend and backend.
2. Open the app in the browser.
3. Navigate to the course/class page.
4. Create a new assignment.
5. Enter the assignment title, prompt, starter code, points, and test cases.
6. Save the assignment.
7. After a student completes the assignment, open the timeline review page.
8. Review the student’s activity events, code snapshots, and suspicious activity analysis.
9. Enter a grade and comments.
10. Save the evaluation.

### Student Instructions

1. Open the app in the browser.
2. Go to the class page.
3. Select an assignment.
4. Read the prompt and starter code.
5. Write Python code in the editor.
6. Click **Run** to test the program.
7. Review the output panel.
8. Use the AI tutor if it is enabled for the assignment.
9. Click **Submit** when finished.

### FAQ

**Does Authored run online?**  
Not currently. The final prototype runs locally.

**Does Authored automatically decide whether a student cheated?**  
No. The timeline and risk analysis are meant to support instructor review. They provide context, but the instructor still makes the final judgment.

**Why track copy, paste, and page leaving?**  
These events can help instructors understand how a solution was created. A paste event is not automatically cheating, but it can be useful context during grading.

**What language does the IDE support?**  
The prototype focuses on Python.

**How does Python run in the browser?**  
Python execution is handled through Pyodide, which allows Python code to run in the browser.

**What is the AI tutor for?**  
The AI tutor is intended to support learning without directly handing students full solutions. The goal is to guide students through concepts and debugging.

**Is this ready for real classroom deployment?**  
Not yet. The prototype demonstrates the core idea, but deployment, security, authentication, automated testing, and scalability would need more work.

---

## 5. Spring Final PPT Presentation

The spring final presentation is included here:

**Presentation Link:**  
_Add link to final presentation here._

If the file is stored in the repository, link it directly here.

---

## 6. Final Expo Poster

The final expo poster is included here:

<img width="4032" height="4608" alt="brown5lc_EXPO" src="https://github.com/user-attachments/assets/8575ee5f-535b-466c-9624-9d8ce98ca144" />

---

## 7. Assessments

### Initial Self-Assessment

The initial self-assessment from the fall semester is included here:

**Initial Self-Assessment Link:**  
https://github.com/brown5lc/authored/blob/main/Assignment%203.md

### Final Self-Assessment

The final self-assessment from the spring semester is included here:

**Final Self-Assessment Link:**  
[Final Self-Assessment.pdf](https://github.com/user-attachments/files/27112133/Final.Self-Assessment.pdf)


---

## 8. Summary of Hours and Justification

Since Authored was completed as a solo project, the hour summary only includes one team member.

| Team Member | Fall Hours | Spring Hours | Total Hours | Amount |
|---|---:|---:|---:|---:|
| Liam Brown | 20 | 40 | 60 | $0.00 |

### Fall Semester Summary

During the fall semester, most of the work focused on planning, project definition, and early design. This included brainstorming the project idea, writing the project description, creating user stories, defining the target users, planning the system flow, creating early diagrams, and thinking through the project scope. This semester was more focused on figuring out what Authored should be and why it would be useful.

### Spring Semester Summary

During the spring semester, most of the work shifted into actual development. I built the frontend and backend prototype, created the main pages, implemented the Monaco-based assignment editor, added Pyodide-based Python execution, built the professor/TA timeline review page, added activity tracking, and connected the main workflow together. I also prepared the project for the final expo and practiced explaining the idea clearly.

### Justification of Hours

The estimated total time spent on Authored was about 60 hours. This includes planning, design work, coding, debugging, manual testing, documentation, poster work, presentation preparation, and the final expo demo. Since I was working alone, all major parts of the project were my responsibility. The most time-consuming work was building the actual local prototype in the spring, especially the assignment IDE, timeline view, activity logging, and review workflow.

Evidence of effort includes the source code repository, supporting documentation repository, project diagrams, final presentation, final poster, and commit history.

---

## 9. Summary of Expenses

| Item | Purpose | Cost |
|---|---|---:|
| Anthropic API usage | Testing/prototyping the no-code AI assistant feature | $5.00 |
| Development tools | VS Code, Node, Vite, React, TypeScript, SQLite, Monaco, Pyodide, Express | $0.00 |
| Hardware | Personal computer used for development | $0.00 |
| Hosting | No hosted deployment | $0.00 |
| **Total** |  | **$5.00** |

Most of the project was built using free or open-source development tools. The only direct expense was about $5.00 for Anthropic API usage while testing the no-code AI assistant feature. No hardware was purchased specifically for this project, and there were no donated hardware or software items.

---

## 10. Appendix

### Repositories

- Source Code Repository: https://github.com/brown5lc/authored_source
- Supporting Documentation Repository: https://github.com/brown5lc/authored

### References and Tools

- React
- TypeScript
- Vite
- Node.js
- Express
- SQLite
- Monaco Editor
- Pyodide
- Material UI
- Anthropic API

### Additional Evidence

- Commit history in the source code repository
- Final presentation
- Final expo poster
- Project documentation repository
- Design diagrams
- Manual testing notes
- Screenshots of the working prototype

### Suggested Screenshots to Include

1. Homepage/dashboard
2. Class page
3. Assignment creation page
4. Assignment IDE with Monaco editor
5. Python output panel after running code
6. Timeline review page
7. Suspicious activity/risk panel
8. Grading/comments section
