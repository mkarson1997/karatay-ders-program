# Privacy

Karatay Course Schedule Builder is a static, browser-based application.

## Data handling

- Course schedule data is loaded from files shipped with the site.
- Course selections are processed in the browser.
- Collision detection and automatic group adjustments run in the browser.
- The optional student-name field is used only to label the downloaded PDF.
- The entered student name is not submitted to the usage-statistics endpoint.
- Individual course selections, timetable details, rooms, teachers and the generated PDF are not submitted to a third-party analytics endpoint.
- No account or server-side user database is required by this project.

## Automatic anonymous usage statistics

After a PDF is generated successfully, the application automatically submits a minimal anonymous usage record to the project's Google Form, whose responses are stored in the linked Google Sheets response table.

The submitted record contains only:

- a fixed anonymous marker (`Anonim kullanım`) for the form's existing name field, and
- the selected planner mode (`1. Sınıf`, `2. Sınıf`, or `1+2 (Karışık)`).

The application does not submit the user's entered name, selected courses, timetable contents, rooms, teachers or generated PDF as part of this usage record.

## External libraries and hosting

The application is hosted through GitHub Pages and loads the assets required by the deployed site. Hosting/network providers may have their own standard access logs outside the application's control.

Anonymous usage records are submitted through Google Forms/Google Sheets.

## Sensitive information

Users should not enter confidential or sensitive personal information into the optional name field. The field exists only to label the locally generated PDF.

## Changes to telemetry

Any future telemetry expansion must remain documented. Personally identifiable information, course selections or timetable contents must not be added to analytics without an explicit user-facing purpose and appropriate consent.

## Security reports

For vulnerability reporting, see [SECURITY.md](SECURITY.md).
