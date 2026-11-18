# Staff user guide

This guide is for an institution **reader** or **caseworker** using the English staff website. Administrators use the separate [staff provisioning runbook](../operations/STAFF_ACCESS.md). The customer mobile app has no staff interface.

## Sign in

1. Obtain the correct staff website address and your individual access token from your authorized administrator. There is no self-registration or shared default production password.
2. Open `/staff/` on that API's origin using HTTPS. Plain HTTP sign-in is allowed only for local development. For the fictional demo the address is `http://127.0.0.1:5100/staff/`; use the generated credential file locally as described in the [demo guide](DEMO_GUIDE.md).
3. Enter the token in **Staff access token**, then select **Sign in**. Do not place it in a URL or send it to a customer.
4. Confirm the institution name, staff ID and role above the inbox. If the identity is wrong, sign out and contact the administrator.

The field clears after submission and the token stays in page memory. Refreshing/reloading the page ends that page session. There are no staff cookies, saved browser credentials managed by this app, SSO or password-reset controls. A staff token remains valid at the API until revoked/configuration changes; browser sign-out does not revoke it.

## Find an enquiry

The initial filter is **All statuses**. Select **Received**, **Contacted** or **Closed** to narrow it. **Refresh** reloads from the newest matching page; **Older enquiries** moves to the next page and **Newest** returns to the start. Pages contain up to 20 records in newest-reference order. Refreshing/filtering clears the current detail selection.

Only enquiries explicitly shared with your institution appear. Private, withdrawn, purged, unassigned or other-institution records are excluded. An empty inbox does not establish that no customer has ever submitted to the platform. This interface has no name/NIC/telephone search, bulk export, ownership reassignment or consent editor.

Select **Open** beside an enquiry to see reference, workflow state, permitted contact details, scheme/branch, enquiry text, received/consent dates and status history. The staff view excludes NIC, age, sex, street address, retry/proof secrets, notification internals and support audit. Times are displayed in **Asia/Colombo**.

## Record follow-up

Readers see **Read-only access** and no update controls. Caseworkers can choose:

| Current state | Available action | Meaning |
| --- | --- | --- |
| Received | **Mark contacted** | Record that staff carried out follow-up using the institution's authorized process |
| Received | **Close enquiry** | End casework without a contacted step |
| Contacted | **Close enquiry** | End casework after follow-up |
| Closed | None | This API does not reopen a closed case |

These buttons record casework only. They do not call, email or message the customer and do not approve/reject a loan. The app has no free-text staff notes editor. Review the audit history for actor, transition and time after updating.

If another caseworker changed the record, the page loads the current detail and asks you to review it before updating again. If a record becomes unavailable after withdrawal/retention, it cannot be opened; a detail 404 refreshes the inbox. The website is request-driven, so use Refresh when you need current visibility rather than assuming the page updates continuously.

## End access and handle problems

Select **Sign out** when finished. Reload/navigation, access failure, or 15 minutes without pointer/keyboard activity clears the page session and visible records. Late requests cannot repopulate a signed-out page. Screenshots or information already viewed are not recalled by that clearing.

| What you see | What to do |
| --- | --- |
| Staff access unavailable | Ask the administrator to check credential bindings/server configuration; the API fails closed when unconfigured |
| Access ended / cannot sign in | Obtain a current authorized token; do not try another institution's token |
| No matching enquiries | Check status filter and Refresh; consent/ownership rules may intentionally exclude a record |
| Enquiry no longer available | Stop trying to work it; consent or retention may have removed access |
| Connection failed | Check connectivity and retry; re-read status after an uncertain update |

Do not use staff credentials for customer proof recovery, retention or consent restoration. Requests involving lost-device/legacy withdrawal go to the controlled [support process](../operations/SUPPORT_RECOVERY.md), not a reference-only workaround.

Implementation evidence: [staff page](../../public/staff/index.html), [browser behavior](../../public/staff/staff.js), [authorization](../../Backend/Middleware/staffAuth.js), [casework API](../../Backend/Controllers/staffController.js).
