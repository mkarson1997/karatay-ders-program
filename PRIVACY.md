# Privacy

Karatay Course Schedule Builder is a static, browser-based application.

## Data handling

- Course schedule data is loaded from files shipped with the site.
- Course selections are processed in the browser.
- Collision detection and automatic group adjustments run in the browser.
- The optional student-name field is used only when rendering the downloaded PDF.
- The application does not send the student name or selected schedule to a third-party analytics/form endpoint.
- No account or server-side user database is required by this project.

## External libraries and hosting

The application is hosted through GitHub Pages and loads the assets required by the deployed site. Hosting/network providers may have their own standard access logs outside the application's control.

## Sensitive information

Users should not enter confidential or sensitive personal information into the optional name field. The field exists only to label the locally generated schedule PDF.

## Changes to telemetry

Any future analytics or telemetry feature must be documented before release and must not silently collect names or schedule selections. Personally identifiable telemetry should require a clear user-facing purpose and consent model.

## Security reports

For vulnerability reporting, see [SECURITY.md](SECURITY.md).
