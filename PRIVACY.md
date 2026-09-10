# Privacy

Karatay Course Schedule Builder is a static, browser-based application.

## Data handling

- Course schedule data is loaded from files shipped with the site.
- Course selections are processed in the browser.
- Collision detection and automatic group adjustments run in the browser.
- The optional student-name field is used to label the downloaded PDF.
- Course selections and the generated timetable are not sent to a third-party analytics endpoint.
- No account or server-side user database is required by this project.

## Optional usage statistics

The interface includes an optional, unchecked usage-statistics control.

If the user explicitly enables it and then successfully generates a PDF, the application sends only:

- the optional name entered in the name field (or `İsim girilmedi` if left blank), and
- the selected planner mode (`1. Sınıf`, `2. Sınıf`, or `1+2 (Karışık)`).

This data is submitted to the project's Google Form and stored in its linked Google Sheets response table. Individual course selections, timetable details, rooms, teachers and the generated PDF are not submitted.

If the usage-statistics control is not enabled, no application-level usage record is submitted to the Google Form.

## External libraries and hosting

The application is hosted through GitHub Pages and loads the assets required by the deployed site. Hosting/network providers may have their own standard access logs outside the application's control.

The optional usage-statistics feature uses Google Forms/Google Sheets when enabled by the user.

## Sensitive information

Users should not enter confidential or sensitive personal information into the optional name field.

## Changes to telemetry

Analytics or telemetry must remain documented and must not silently collect names or schedule selections. Personally identifiable telemetry requires a clear user-facing purpose and consent model.

## Security reports

For vulnerability reporting, see [SECURITY.md](SECURITY.md).
