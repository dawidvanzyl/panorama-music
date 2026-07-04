# Security Standards (v1.2)

Application security requirements for the Panorama Music project, derived from the **OWASP Application Security Verification Standard (ASVS) 5.0.0**, scoped to this stack: ASP.NET Core API, React SPA, JWT authentication, PostgreSQL, REST endpoints.

> This document targets **ASVS Level 1 and Level 2**, with a small number of **Level 3** rules adopted individually where cheap and relevant — each is tagged `[L3]` explicitly. Each rule is tagged `[L1]`, `[L2]`, or `[L3]`.
>
> For workflow, branching, and coding conventions see `coding-standards.md`, `coding-standards-backend.md`, and `coding-standards-frontend.md`.

---

# 1. Encoding and Sanitization

## 1.1 Encoding Architecture

* `[L2]` `ASVS 5.0.0-1.1.1` Input must be decoded or unescaped to a canonical form only once, and only when encoded data in that form is expected. Decoding must happen before validation or sanitization, not after.
* `[L2]` `ASVS 5.0.0-1.1.2` Output encoding and escaping must be performed as the final step before data reaches the interpreter (e.g., the browser or SQL engine), or must be handled by the interpreter itself. Do not encode early and pass encoded data through the application.

## 1.2 Injection Prevention

* `[L1]` `ASVS 5.0.0-1.2.1` Output encoding for HTTP responses must match the context: HTML elements, HTML attributes, HTML comments, CSS, and HTTP header values each require different encoding. Do not use generic HTML encoding across all contexts.
* `[L1]` `ASVS 5.0.0-1.2.2` When building URLs dynamically, untrusted data must be URL-encoded or base64url-encoded for query and path parameters. Only safe URL schemes are permitted — `javascript:` and `data:` are never allowed.
* `[L1]` `ASVS 5.0.0-1.2.3` When building JavaScript or JSON content dynamically, output encoding or escaping must be used to prevent JavaScript or JSON injection.
* `[L1]` `ASVS 5.0.0-1.2.4` All database queries (SQL, HQL, NoSQL) must use parameterized queries, ORMs, or entity frameworks. String concatenation into SQL is a blocker. This applies to stored procedures as well.
* `[L1]` `ASVS 5.0.0-1.2.5` OS calls must use parameterized OS queries or contextual command-line output encoding. Do not pass untrusted input directly to shell commands.
* `[L2]` `ASVS 5.0.0-1.2.6` LDAP injection must be prevented with parameterization or specific security controls if LDAP is used.
* `[L2]` `ASVS 5.0.0-1.2.7` XPath queries must use parameterization or precompiled queries if XML querying is used.
* `[L2]` `ASVS 5.0.0-1.2.9` Special characters in regular expressions must be escaped (typically with a backslash) so they are not misinterpreted as metacharacters.

## 1.3 Sanitization

* `[L1]` `ASVS 5.0.0-1.3.2` Dynamic code execution (`eval()` or equivalent) must not be used. If there is no alternative, all user input included in it must be sanitized first.
* `[L2]` `ASVS 5.0.0-1.3.3` Data passed into a potentially dangerous context must be sanitized beforehand — only allow characters that are safe for the specific context and trim excessively long input.
* `[L2]` `ASVS 5.0.0-1.3.6` SSRF must be prevented by validating untrusted data against an allowlist of protocols, domains, paths, and ports before using it to call another service.
* `[L2]` `ASVS 5.0.0-1.3.7` Template injection must be prevented by not building templates from untrusted input. Where unavoidable, untrusted input must be sanitized or strictly validated before dynamic inclusion.
* `[L2]` `ASVS 5.0.0-1.3.10` Format strings that might resolve unexpectedly or maliciously must be sanitized before processing.
* `[L2]` `ASVS 5.0.0-1.3.11` The application must sanitize user input before passing it to mail systems, to protect against SMTP/IMAP injection. **Status: met today** — outbound mail (`SmtpEmailService`) is built and sent via MailKit, whose `MailboxAddress.Parse`/`MimeMessage` reject malformed addresses and correctly encode header values, so raw CR/LF injection via the recipient address is not possible. Re-verify this rule whenever the mail-sending code path changes (e.g. if a free-text "display name" or subject line is ever built from user input).
* `[L3]` `ASVS 5.0.0-1.3.12` Regular expressions must be free from elements causing exponential backtracking (ReDoS); untrusted input used in regex matching must be sanitized or length-bounded first. Adopted as a coding guideline: prefer FluentValidation's built-in rules (e.g. `.EmailAddress()`) over hand-written regex; if a custom regex is ever introduced, it must be reviewed for backtracking risk before merging.

## 1.4 Safe Deserialization

* `[L1]` `ASVS 5.0.0-1.5.1` XML parsers must be configured with a restrictive configuration — external entity resolution must be disabled to prevent XXE attacks.
* `[L2]` `ASVS 5.0.0-1.5.2` Deserialization of untrusted data must enforce safe input handling using an allowlist of object types or by restricting client-defined object types. Deserialization mechanisms explicitly documented as insecure must not be used with untrusted input.

---

# 2. Validation and Business Logic

## 2.1 Documentation

* `[L1]` `ASVS 5.0.0-2.1.1` Application documentation must define input validation rules — what structure, format, and range is expected for each data item (e.g., email, date, numeric ranges).
* `[L2]` `ASVS 5.0.0-2.1.2` Documentation must define how to validate logical and contextual consistency of combined data items (e.g., paired fields that must be coherent together).
* `[L2]` `ASVS 5.0.0-2.1.3` Expected business logic limits and validations must be documented, including both per-user and global limits across the application.

## 2.2 Input Validation

* `[L1]` `ASVS 5.0.0-2.2.1` Input must be validated using positive validation against an allowlist of values, patterns, and ranges, or by comparing against an expected structure and logical limits. For L1, this must apply at minimum to inputs used for business or security decisions.
* `[L1]` `ASVS 5.0.0-2.2.2` Input validation must be enforced at a trusted service layer (the API backend). Client-side validation improves UX but must never be the sole security control.
* `[L2]` `ASVS 5.0.0-2.2.3` Combinations of related data items must be validated for logical consistency according to pre-defined rules.

## 2.3 Business Logic Security

* `[L1]` `ASVS 5.0.0-2.3.1` Business logic flows must be processed in the expected sequential order and must not allow steps to be skipped.
* `[L2]` `ASVS 5.0.0-2.3.2` Business logic limits must be implemented as per the application's documentation to prevent exploitation of logic flaws.
* `[L2]` `ASVS 5.0.0-2.3.3` Transactions must be used at the business logic level — a business operation either succeeds entirely or is rolled back to the previous valid state.

## 2.4 Anti-automation

* `[L2]` `ASVS 5.0.0-2.4.1` Anti-automation controls must be in place to protect against excessive calls to application functions that could lead to data exfiltration, garbage-data creation, quota exhaustion, rate-limit breaches, or denial-of-service.

---

# 3. Web Frontend Security

## 3.1 Unintended Content Interpretation

* `[L1]` `ASVS 5.0.0-3.2.1` Security controls must prevent browsers from rendering content in an incorrect context (e.g., when an API response or user-uploaded file is requested directly). Use `Sec-Fetch-*` header validation, `Content-Security-Policy: sandbox`, or `Content-Disposition: attachment` as appropriate.
* `[L1]` `ASVS 5.0.0-3.2.2` Content intended to be displayed as text (not rendered as HTML) must use safe rendering functions such as `createTextNode` or `textContent`, not `innerHTML`.

## 3.2 Cookie Security

* `[L1]` `ASVS 5.0.0-3.3.1` All cookies must have the `Secure` attribute set. If the `__Host-` prefix is not used, the `__Secure-` prefix must be used on the cookie name.
* `[L2]` `ASVS 5.0.0-3.3.2` Each cookie's `SameSite` attribute must be set according to its purpose to limit exposure to CSRF and UI redress attacks.
* `[L2]` `ASVS 5.0.0-3.3.3` Cookies must use the `__Host-` prefix unless they are explicitly designed to be shared with other hosts.
* `[L2]` `ASVS 5.0.0-3.3.4` Session tokens stored in cookies must have the `HttpOnly` attribute set and must only be transferred to the client via the `Set-Cookie` response header.

## 3.3 Browser Security Headers

* `[L1]` `ASVS 5.0.0-3.4.1` All responses must include a `Strict-Transport-Security` header with a minimum `max-age` of one year. For L2 the policy must also apply to all subdomains.
* `[L1]` `ASVS 5.0.0-3.4.2` The `Access-Control-Allow-Origin` header must be a fixed value or, if the request `Origin` header is reflected, it must be validated against an allowlist of trusted origins. `Access-Control-Allow-Origin: *` must never be used on responses containing sensitive data.
* `[L2]` `ASVS 5.0.0-3.4.3` All HTTP responses must include a `Content-Security-Policy` header. At minimum the global policy must include `object-src 'none'`, `base-uri 'none'`, and define either a source allowlist or use nonces or hashes.
* `[L2]` `ASVS 5.0.0-3.4.4` All HTTP responses must include `X-Content-Type-Options: nosniff` to prevent MIME-type sniffing.
* `[L2]` `ASVS 5.0.0-3.4.5` A `Referrer-Policy` header must be set on all responses to prevent leaking technically sensitive data (path, query, hostname) to third-party services via the `Referer` header.
* `[L2]` `ASVS 5.0.0-3.4.6` Every HTTP response must include a `Content-Security-Policy` `frame-ancestors` directive to control embedding. Default must be deny; allow only where explicitly required.
* `[L3]` `ASVS 5.0.0-3.4.8` All HTTP responses that initiate document rendering (e.g. `Content-Type: text/html`) must include `Cross-Origin-Opener-Policy` with `same-origin` (or `same-origin-allow-popups` if required), to prevent tabnabbing and frame-counting attacks that abuse shared `Window` object access. Adopted alongside the other headers in this section since it's a single extra header on the same response path.

## 3.4 CSRF and Origin Separation

* `[L1]` `ASVS 5.0.0-3.5.1` If the application does not rely on the CORS preflight mechanism to block disallowed cross-origin requests, sensitive endpoints must validate that requests originate from the application itself — using anti-forgery tokens or custom HTTP headers not in the CORS safelist.
* `[L1]` `ASVS 5.0.0-3.5.2` If the CORS preflight mechanism is used to protect sensitive functionality, it must not be possible to invoke that functionality with a request that does not trigger a CORS preflight. Validate `Origin` and `Content-Type` headers, or require a custom header.
* `[L1]` `ASVS 5.0.0-3.5.3` Sensitive functionality must use `POST`, `PUT`, `PATCH`, or `DELETE`. Safe HTTP methods (`GET`, `HEAD`, `OPTIONS`) must not trigger state changes or sensitive operations.
* `[L2]` `ASVS 5.0.0-3.5.4` Separate applications must be hosted on different hostnames to leverage same-origin policy restrictions.
* `[L2]` `ASVS 5.0.0-3.5.5` Messages received via `postMessage` must be discarded if the sender origin is not trusted or if the message syntax is invalid.
* `[L3]` `ASVS 5.0.0-3.5.8` Authenticated resources (images, scripts, documents, etc.) must be loadable cross-origin only when intended — enforced via strict `Sec-Fetch-*` request header validation or a restrictive `Cross-Origin-Resource-Policy` response header. Adopted for `/api/users/*` specifically, since that's the one resource family that returns sensitive, authenticated data.

## 3.5 Other Frontend Controls

* `[L2]` `ASVS 5.0.0-3.7.1` Only client-side technologies that are still supported and considered secure may be used. Flash, ActiveX, Silverlight, NPAPI plugins, and client-side Java applets are prohibited.
* `[L2]` `ASVS 5.0.0-3.7.2` Automatic redirects to hostnames or domains not controlled by the application are only permitted if the destination appears on a documented allowlist.

---

# 4. API and Web Service

## 4.1 Generic Web Service Security

* `[L1]` `ASVS 5.0.0-4.1.1` Every HTTP response with a message body must include a `Content-Type` header that matches the actual content of the response, including the character set (e.g., `application/json; charset=utf-8`).
* `[L2]` `ASVS 5.0.0-4.1.2` Only user-facing endpoints intended for browser access should automatically redirect from HTTP to HTTPS. API and service endpoints must not silently redirect — this would mask clients sending unencrypted requests.
* `[L2]` `ASVS 5.0.0-4.1.3` HTTP header fields set by intermediary layers (load balancers, proxies, reverse proxies) such as `X-Real-IP`, `X-Forwarded-For`, or `X-User-ID` must not be overridable by the end-user.

## 4.2 HTTP Message Integrity

* `[L2]` `ASVS 5.0.0-4.2.1` All application components (load balancers, firewalls, application servers) must determine HTTP message boundaries using the correct mechanism for the HTTP version in use, to prevent request smuggling — e.g. in HTTP/1.x, if `Transfer-Encoding` is present, `Content-Length` must be ignored. **Status: met today** via Kestrel's compliant HTTP/1.1 and HTTP/2 framing; no app-level code is involved. Re-verify if a reverse proxy is introduced in front of the API.

---

# 5. Authentication

## 5.1 Documentation

* `[L1]` `ASVS 5.0.0-6.1.1` Application documentation must define how rate limiting, anti-automation, and adaptive response controls are configured to defend against credential stuffing and brute-force attacks, including how malicious account lockout is prevented. **Status: met today** — `/api/auth/login`, `/refresh`, `/forgot-password`, and `/reset-password` are rate-limited via ASP.NET Core's built-in `RateLimiter` middleware (`RateLimitingExtensions.AddAuthRateLimiting`), configured under `RateLimiting:Auth` (`IpPermitLimit`, `AccountPermitLimit`, `WindowSeconds`; no code-level defaults — config is required). Three independent fixed-window dimensions apply: per-IP, per-account (email for `login`/`forgot-password`, token-resolved account for `refresh`/`reset-password`), and per-token (`refresh`/`reset-password` only, which have no email field). Either threshold exceeded returns `429`; windows reset automatically — no manual unlock, so this does not constitute an account lockout. Anti-automation beyond these four endpoints (e.g. CAPTCHA) remains unimplemented — see §2.4.
* `[L2]` `ASVS 5.0.0-6.1.2` A list of context-specific words must be documented to prevent their use in passwords — e.g. permutations of organization/product names, system identifiers, project codenames, department or role names.
* `[L2]` `ASVS 5.0.0-6.1.3` If the application includes multiple authentication pathways, all pathways must be documented together with their security controls and the authentication strength enforced consistently across them.

## 5.2 Password Security

* `[L1]` `ASVS 5.0.0-6.2.1` User-set passwords must be at least 8 characters in length. A minimum of 15 characters is strongly recommended.
* `[L1]` `ASVS 5.0.0-6.2.2` Users must be able to change their password.
* `[L1]` `ASVS 5.0.0-6.2.3` Password change functionality must require the user's current password and the new password.
* `[L1]` `ASVS 5.0.0-6.2.4` Passwords submitted during registration or password change must be checked against a set of at least the top 3,000 passwords that match the application's password policy (e.g., minimum length).
* `[L1]` `ASVS 5.0.0-6.2.5` Passwords of any composition must be permitted — no rules limiting character types are allowed. There must be no minimum requirement for uppercase, lowercase, numeric, or special characters.
* `[L1]` `ASVS 5.0.0-6.2.6` Password input fields must use `type="password"` to mask entry. Temporarily revealing the full masked password or the last typed character is permitted.
* `[L1]` `ASVS 5.0.0-6.2.7` Paste functionality, browser password helpers, and external password managers must be permitted.
* `[L1]` `ASVS 5.0.0-6.2.8` The application must verify the user's password exactly as received, without modification such as truncation or case transformation.
* `[L2]` `ASVS 5.0.0-6.2.9` Passwords of at least 64 characters must be permitted.
* `[L2]` `ASVS 5.0.0-6.2.10` A user's password must stay valid until it is discovered to be compromised or the user rotates it. Periodic forced credential rotation must not be implemented.
* `[L2]` `ASVS 5.0.0-6.2.11` The documented list of context-specific words (6.1.2) must actually be used to reject easy-to-guess passwords at registration/change time.
* `[L2]` `ASVS 5.0.0-6.2.12` Passwords submitted during registration or password changes must be checked against a set of known-breached passwords.

## 5.3 General Authentication Security

* `[L1]` `ASVS 5.0.0-6.3.1` Controls to prevent credential stuffing and password brute-force must be implemented as documented in the application's security documentation.
* `[L1]` `ASVS 5.0.0-6.3.2` Default user accounts (e.g., `root`, `admin`, `sa`) must not be present in the application or must be disabled.
* `[L2]` `ASVS 5.0.0-6.3.3` Multi-factor authentication (MFA) or a combination of single-factor mechanisms must be required to access the application. Relaxing this requirement requires a fully documented rationale and a comprehensive set of mitigating controls.
* `[L2]` `ASVS 5.0.0-6.3.4` If the application includes multiple authentication pathways, there must be no undocumented pathways and security controls must be enforced consistently.
* `[L3]` `ASVS 5.0.0-6.3.8` Valid users must not be deducible from failed authentication challenges — error messages, HTTP response codes, and **response timing** must not differ based on whether the account exists. Applies to login, registration, and forgot-password. **Partially met, one known gap:** `forgot-password` always returns 202 regardless of whether the email exists, and `login` returns the same "Invalid credentials" message for both a nonexistent email and a wrong password. However, `LoginHandler.HandleAsync` only invokes the Argon2id `Verify` call on the path where a user record was found, so a nonexistent-email request returns measurably faster than a wrong-password request for a real account — a timing side-channel for user enumeration. Track as a follow-up: run a constant-time dummy hash verification on the "user not found" path too.

## 5.4 Authentication Factor Lifecycle

* `[L1]` `ASVS 5.0.0-6.4.1` System-generated initial passwords or activation codes must be securely randomly generated, follow the existing password policy, and expire after a short period or after first use. Initial secrets must not become the long-term password.
* `[L1]` `ASVS 5.0.0-6.4.2` Password hints and knowledge-based authentication ("secret questions") must not be present.
* `[L2]` `ASVS 5.0.0-6.4.3` A secure forgot-password process must be implemented that does not bypass any enabled MFA mechanisms.

## 5.5 Authentication Assertions

* `[L2]` `ASVS 5.0.0-6.8.2` The presence and integrity of digital signatures on authentication assertions (e.g., JWTs, SAML assertions) must always be validated. Unsigned assertions or assertions with invalid signatures must be rejected.

---

# 6. Session Management

## 6.1 Fundamental Session Security

* `[L1]` `ASVS 5.0.0-7.2.1` All session token verification must be performed using a trusted backend service.
* `[L1]` `ASVS 5.0.0-7.2.2` Session management must use dynamically generated self-contained or reference tokens — not static API secrets or keys.
* `[L1]` `ASVS 5.0.0-7.2.3` If reference tokens are used for session management, they must be unique, generated using a CSPRNG, and possess at least 128 bits of entropy.
* `[L1]` `ASVS 5.0.0-7.2.4` The application must generate a new session token on user authentication (including re-authentication) and must terminate the previous session token.

## 6.2 Session Timeout

* `[L2]` `ASVS 5.0.0-7.3.1` An inactivity timeout must be enforced such that re-authentication is required according to the documented risk analysis and security decisions.
* `[L2]` `ASVS 5.0.0-7.3.2` An absolute maximum session lifetime must be enforced such that re-authentication is required according to the documented risk analysis and security decisions.

## 6.3 Session Termination

* `[L1]` `ASVS 5.0.0-7.4.1` When session termination is triggered (logout or expiration), the application must disallow any further use of the session. For JWTs (self-contained tokens) this requires a mechanism such as a denylist of terminated tokens or a per-user signing key rotation.
* `[L1]` `ASVS 5.0.0-7.4.2` All active sessions must be terminated when a user account is disabled or deleted.
* `[L2]` `ASVS 5.0.0-7.4.3` After a successful change or removal of any authentication factor (including password reset/recovery and MFA settings), the user must be given the option to terminate all other active sessions.
* `[L2]` `ASVS 5.0.0-7.4.4` All pages requiring authentication must provide easy and visible access to logout functionality.
* `[L2]` `ASVS 5.0.0-7.4.5` Administrators must be able to terminate active sessions for an individual user or for all users.

## 6.4 Session Abuse Defenses

* `[L2]` `ASVS 5.0.0-7.5.1` Full re-authentication must be required before allowing modifications to sensitive account attributes that may affect authentication, such as email address, phone number, MFA configuration, or account recovery information.
* `[L2]` `ASVS 5.0.0-7.5.2` Users must be able to view and (after authenticating with at least one factor) terminate any or all of their currently active sessions.

## 6.5 Session Documentation

* `[L2]` `ASVS 5.0.0-7.1.1` The user's session inactivity timeout and absolute maximum session lifetime must be documented, appropriate in combination with other controls. **Current values:** access tokens expire after 15 minutes (`JwtService`); refresh tokens after 7 days, rotated on every use and revoked on logout (`LoginHandler`/`RefreshTokenHandler`/`LogoutHandler`). No inactivity timeout exists separately from the absolute refresh-token lifetime.
* `[L2]` `ASVS 5.0.0-7.1.2` The number of concurrent (parallel) sessions allowed per account, and the behavior when the maximum is reached, must be documented. **Documented decision:** no concurrent-session cap is enforced. Each login issues a new, independent refresh token; multiple devices/sessions per user are permitted by design.

---

# 7. Authorization

## 7.1 Documentation

* `[L1]` `ASVS 5.0.0-8.1.1` Authorization documentation must define rules for restricting function-level and data-specific access based on consumer permissions and resource attributes.
* `[L2]` `ASVS 5.0.0-8.1.2` Authorization documentation must define rules for field-level access restrictions (both read and write) based on consumer permissions and resource attributes, including rules that depend on the state or status of the data object.

## 7.2 Authorization Design

* `[L1]` `ASVS 5.0.0-8.2.1` Function-level access must be restricted to consumers with explicit permissions.
* `[L1]` `ASVS 5.0.0-8.2.2` Data-specific access must be restricted to consumers with explicit permissions to specific data items, mitigating IDOR and Broken Object Level Authorization (BOLA).
* `[L2]` `ASVS 5.0.0-8.2.3` Field-level access must be restricted to consumers with explicit permissions to specific fields, mitigating Broken Object Property Level Authorization (BOPLA).

## 7.3 Enforcement

* `[L1]` `ASVS 5.0.0-8.3.1` Authorization rules must be enforced at a trusted service layer (the API backend). Authorization must never rely on controls that an untrusted consumer could manipulate, such as client-side JavaScript.
* `[L2]` `ASVS 5.0.0-8.4.1` If the application supports multiple tenants, cross-tenant controls must ensure that operations performed by a consumer will never affect tenants with which they have no permissions to interact.
* `[L3]` `ASVS 5.0.0-8.3.2` Changes to values that authorization decisions are based on must take effect immediately; where that's not possible (e.g. claims embedded in a self-contained token), mitigating controls must alert on and revert actions taken by a no-longer-authorized consumer. **Documented accepted limitation:** role/active-status changes to a user do not invalidate that user's already-issued access token. A demoted or deactivated admin's existing JWT remains valid for up to 15 minutes (the access-token TTL) before the new state takes effect. Refresh tokens *are* revoked immediately on deactivation (`UserRepository.DeactivateAsync`), bounding the exposure window to the access-token lifetime.

---

# 8. Self-contained Tokens (JWT)

## 8.1 Token Source and Integrity

* `[L1]` `ASVS 5.0.0-9.1.1` Self-contained tokens must be validated using their digital signature or MAC to protect against tampering before the token's contents are accepted.
* `[L1]` `ASVS 5.0.0-9.1.2` Only an algorithm allowlist may be used to create and verify tokens for a given context. The allowlist must specify the permitted algorithms and must not include the `none` algorithm. If both symmetric and asymmetric algorithms must be supported, additional controls are required to prevent key confusion.
* `[L1]` `ASVS 5.0.0-9.1.3` Key material used to validate tokens must come from trusted, pre-configured sources for the token issuer. JWT headers such as `jku`, `x5u`, and `jwk` must be validated against an allowlist of trusted sources — never accepted from the token itself.

## 8.2 Token Content

* `[L1]` `ASVS 5.0.0-9.2.1` If a validity time span is present in the token, the token and its contents must only be accepted if the verification time is within the validity window. For JWTs, the `nbf` and `exp` claims must be verified.
* `[L2]` `ASVS 5.0.0-9.2.2` A service receiving a token must validate that it is the correct token type and is intended for the purpose it is being used for before accepting its contents. Access tokens must be used only for authorization; ID tokens only for proving user authentication.
* `[L2]` `ASVS 5.0.0-9.2.3` A service must only accept tokens that are intended for use with that service (audience). For JWTs, the `aud` claim must be validated against an allowlist defined in the service.
* `[L2]` `ASVS 5.0.0-9.2.4` If a token issuer uses the same private key for tokens issued to different audiences, issued tokens must contain an audience restriction that uniquely identifies the intended audiences to prevent cross-audience token reuse.

---

# 9. Cryptography

## 9.1 Inventory and Documentation

* `[L2]` `ASVS 5.0.0-11.1.1` A documented policy for cryptographic key management must exist, including a key lifecycle that follows a key management standard (e.g., NIST SP 800-57). Keys must not be overshared — shared secrets must not be shared with more than two entities; private keys with more than one entity.
* `[L2]` `ASVS 5.0.0-11.1.2` A cryptographic inventory must be maintained and regularly updated, including all cryptographic keys, algorithms, and certificates used by the application, where keys can and cannot be used, and the types of data they protect.

## 9.2 Algorithm Selection

* `[L2]` `ASVS 5.0.0-11.2.1` Industry-validated implementations — including well-known libraries and hardware-accelerated implementations — must be used for all cryptographic operations. Do not implement cryptographic primitives from scratch.
* `[L2]` `ASVS 5.0.0-11.2.2` The application must be designed with crypto agility: algorithms, key lengths, ciphers, and modes must be reconfigurable or swappable without significant refactoring. Keys and passwords must be replaceable and data must be re-encryptable.
* `[L2]` `ASVS 5.0.0-11.2.3` All cryptographic primitives must provide a minimum of 128 bits of security based on the algorithm, key size, and configuration (e.g., 256-bit ECC, 3072-bit RSA).
* `[L3]` `ASVS 5.0.0-11.2.4` All cryptographic operations must be constant-time, with no short-circuit comparisons/calculations/returns that could leak information. **Status: already met** — `Argon2PasswordHashService.CryptographicEquals` performs a fixed-time XOR-accumulate comparison rather than `==`/`SequenceEqual`. Documented here as verified-compliant, not as new work.

## 9.3 Encryption Algorithms

* `[L1]` `ASVS 5.0.0-11.3.1` Insecure block modes (e.g., ECB) and weak padding schemes (e.g., PKCS#1 v1.5) must not be used.
* `[L1]` `ASVS 5.0.0-11.3.2` Only approved ciphers and modes must be used — AES with GCM is the recommended standard.
* `[L2]` `ASVS 5.0.0-11.3.3` Encrypted data must be protected against unauthorized modification using authenticated encryption (e.g., AES-GCM) or by combining encryption with an approved MAC algorithm.

## 9.4 Hashing

* `[L1]` `ASVS 5.0.0-11.4.1` Only approved hash functions must be used for general cryptographic purposes including digital signatures, HMAC, KDF, and random bit generation. MD5 must not be used for any cryptographic purpose. **Status: scoped exemption** — `HibpPasswordService` uses SHA-1 only to compute the k-anonymity prefix/suffix required by HIBP's Pwned Passwords range API; this is bucketing for a public anonymity-set protocol, not a cryptographic integrity or secrecy use, so the prohibition this control targets doesn't apply.
* `[L2]` `ASVS 5.0.0-11.4.2` Passwords must be stored using an approved, computationally intensive key derivation function (e.g., Argon2id, bcrypt, scrypt) with parameters configured to make brute-force sufficiently costly. Parameters must be reviewed and updated as hardware improves.
* `[L2]` `ASVS 5.0.0-11.4.3` Hash functions used in digital signatures or for data authentication/integrity must be collision-resistant with at least 256-bit output. If only resistance to second pre-image attacks is required, at least 128-bit output is required.
* `[L2]` `ASVS 5.0.0-11.4.4` Approved key derivation functions with key-stretching parameters must be used when deriving secret keys from passwords, balancing security and performance.

## 9.5 Random Number Generation

* `[L2]` `ASVS 5.0.0-11.5.1` All random numbers and strings intended to be non-guessable (tokens, nonces, identifiers) must be generated using a Cryptographically Secure Pseudo-random Number Generator (CSPRNG) with at least 128 bits of entropy. UUIDs do not meet this requirement.

---

# 10. Secure Communication

## 10.1 TLS Configuration

* `[L1]` `ASVS 5.0.0-12.1.1` Only the latest recommended versions of TLS must be enabled — TLS 1.2 and TLS 1.3. The latest version must be the preferred option. Older versions (TLS 1.0, TLS 1.1, SSL) must be disabled.
* `[L2]` `ASVS 5.0.0-12.1.2` Only recommended cipher suites must be enabled, with the strongest suites set as preferred.
* `[L2]` `ASVS 5.0.0-12.1.3` Where mutual TLS (mTLS) is used, client certificates must be validated as trusted before the certificate identity is used for authentication or authorization.

## 10.2 External-facing Services

* `[L1]` `ASVS 5.0.0-12.2.1` TLS must be used for all connectivity between a client and external-facing HTTP-based services. No fallback to unencrypted communication.
* `[L1]` `ASVS 5.0.0-12.2.2` External-facing services must use publicly trusted TLS certificates.

## 10.3 Internal Service Communication

* `[L2]` `ASVS 5.0.0-12.3.1` An encrypted protocol such as TLS must be used for all inbound and outbound connections to and from the application, including monitoring systems, management tools, remote access, middleware, and databases. No fallback to insecure or unencrypted protocols. **Action item:** the Npgsql connection string does not currently set an explicit `SSL Mode`; verify/set `SSL Mode=Require` (or stronger) for any non-localhost Postgres connection (QA/Prod), since the implicit default must not silently allow a plaintext fallback.
* `[L2]` `ASVS 5.0.0-12.3.2` TLS clients must validate the server's certificate before communicating with a TLS server.
* `[L2]` `ASVS 5.0.0-12.3.3` TLS or another appropriate transport encryption mechanism must be used for all connectivity between internal HTTP-based services within the application, with no fallback to unencrypted communication.
* `[L2]` `ASVS 5.0.0-12.3.4` TLS connections between internal services must use trusted certificates. Where internally generated or self-signed certificates are used, consuming services must be configured to trust only specific internal CAs or specific self-signed certificates.

---

# 11. Configuration

## 11.1 Backend Communication

* `[L2]` `ASVS 5.0.0-13.1.1` All communication needs for the application must be documented, including external services the application relies on and cases where an end-user might be able to provide an external location to which the application will connect.
* `[L2]` `ASVS 5.0.0-13.2.1` Communications between backend application components (APIs, middleware, data layers) must be authenticated using individual service accounts, short-term tokens, or certificate-based authentication. Shared accounts or static credentials with privileged access must not be used.
* `[L2]` `ASVS 5.0.0-13.2.2` Communications between backend application components must use accounts assigned the least necessary privilege.
* `[L2]` `ASVS 5.0.0-13.2.3` If a credential is used for service authentication, it must not be a default credential (e.g., `root/root`, `admin/admin`).
* `[L2]` `ASVS 5.0.0-13.2.4` An allowlist must define the external resources or systems with which the application is permitted to communicate. This allowlist may be implemented at the application layer, web server, firewall, or a combination.
* `[L2]` `ASVS 5.0.0-13.2.5` The web or application server must be configured with an allowlist of resources or systems to which it can send requests or load data/files from. **Documented allowlist:** the SMTP host defined by `Smtp__Host`/`Smtp__Port`, and `api.pwnedpasswords.com` (HIBP Pwned Passwords range endpoint, called by `HibpPasswordService`; base address is hardcoded, not user-influenced, and toggled via `Hibp:Enabled`). No other egress exists.

## 11.2 Secret Management

* `[L2]` `ASVS 5.0.0-13.3.1` A secrets management solution (e.g., a key vault, environment-level secret injection) must be used to securely create, store, control access to, and destroy backend secrets. Secrets — including API keys, database passwords, JWT signing keys, and integration credentials — must not appear in source code or build artifacts.
* `[L2]` `ASVS 5.0.0-13.3.2` Access to secret assets must adhere to the principle of least privilege.
* `[L2]` `ASVS 5.0.0-13.3.4` *(Included as best practice from L3)* A rotation schedule for each category of secret must be documented based on the organization's threat model and business requirements. Secrets must be configured to expire and be rotated according to this schedule.

## 11.3 Information Leakage

* `[L1]` `ASVS 5.0.0-13.4.1` The application must be deployed without source control metadata (`.git`, `.svn` folders), or those folders must be inaccessible both externally and to the application itself.
* `[L2]` `ASVS 5.0.0-13.4.2` Debug modes must be disabled for all components in production environments to prevent exposure of debugging features and information leakage.
* `[L2]` `ASVS 5.0.0-13.4.3` Web servers must not expose directory listings unless explicitly required.
* `[L2]` `ASVS 5.0.0-13.4.4` The HTTP `TRACE` method must not be supported in production environments.
* `[L2]` `ASVS 5.0.0-13.4.5` Documentation endpoints and monitoring endpoints must not be publicly exposed unless explicitly intended and secured.
* `[L3]` `ASVS 5.0.0-13.4.6` The application must not expose detailed version information of backend components. Verify Kestrel's `Server` response header is suppressed (`AddServerHeader = false`) rather than advertising the Kestrel/.NET version.
* `[L3]` `ASVS 5.0.0-13.4.7` The web tier must be configured to only serve files with specific, expected file extensions, to prevent unintentional information, configuration, or source leakage. Verify the built `wwwroot` output (the published frontend `dist`) does not contain stray non-asset files.

---

# 12. Data Protection

## 12.1 Data Classification

* `[L2]` `ASVS 5.0.0-14.1.1` All sensitive data created and processed by the application must be identified and classified into protection levels. This includes data that is only encoded (e.g., Base64 or JWT plaintext payload) and therefore easily decoded. Protection levels must account for relevant data protection and privacy regulations.
* `[L2]` `ASVS 5.0.0-14.1.2` All sensitive data protection levels must have a documented set of protection requirements, including encryption, integrity verification, retention, logging controls, access controls around sensitive data in logs, and privacy requirements.

## 12.2 General Data Protection

* `[L1]` `ASVS 5.0.0-14.2.1` Sensitive data must only be sent to the server in the HTTP message body or headers. URLs and query strings must not contain sensitive information such as API keys or session tokens.
* `[L2]` `ASVS 5.0.0-14.2.2` The application must prevent sensitive data from being cached in server components (load balancers, application caches) or ensure it is securely purged after use.
* `[L2]` `ASVS 5.0.0-14.2.3` Defined sensitive data must not be sent to untrusted third parties (e.g., analytics trackers) without explicit justification.
* `[L2]` `ASVS 5.0.0-14.2.4` Controls for sensitive data (encryption, integrity verification, retention, logging access controls) must be implemented as defined in the documentation for that data's protection level.
* `[L3]` `ASVS 5.0.0-14.2.5` Caching mechanisms must only cache responses with the expected content type for that resource, and must not cache sensitive, dynamic content; a missing resource must return 404/302 rather than a different valid file, to prevent Web Cache Deception. Verify this stays consistent with the `Cache-Control: no-store` requirement already adopted in 14.3.2.

## 12.3 Client-side Data Protection

* `[L1]` `ASVS 5.0.0-14.3.1` Authenticated data must be cleared from client storage (browser DOM, local state) after the client or session is terminated. The `Clear-Site-Data` HTTP response header may assist, but the client side must also be able to clean up if the server is unavailable.
* `[L2]` `ASVS 5.0.0-14.3.2` Anti-caching HTTP response headers (e.g., `Cache-Control: no-store`) must be set on responses containing sensitive data to prevent browser caching.
* `[L2]` `ASVS 5.0.0-14.3.3` Data stored in browser storage (localStorage, sessionStorage, IndexedDB, cookies) must not contain sensitive data, with the exception of session tokens.

---

# 13. Secure Coding and Architecture

## 13.1 Dependency Management

* `[L1]` `ASVS 5.0.0-15.1.1` Application documentation must define risk-based remediation timeframes for third-party components with known vulnerabilities and for updating libraries in general.
* `[L2]` `ASVS 5.0.0-15.1.2` An inventory (e.g., SBOM — Software Bill of Materials) must be maintained for all third-party libraries in use. Components must come from pre-defined, trusted, and continually maintained repositories.
* `[L2]` `ASVS 5.0.0-15.1.3` Application documentation must identify functionality that is time-consuming or resource-demanding, along with how loss of availability from overuse is prevented and how to avoid response timeouts.
* `[L1]` `ASVS 5.0.0-15.2.1` The application must only contain components that have not exceeded their documented update and remediation timeframes.
* `[L2]` `ASVS 5.0.0-15.2.2` The application must have defenses against loss of availability from time-consuming or resource-demanding functionality, as defined in documented security decisions.
* `[L2]` `ASVS 5.0.0-15.2.3` The production environment must only include functionality required for the application to operate. Test code, sample snippets, and development functionality must not be present in production.
* `[L3]` `ASVS 5.0.0-15.2.4` Third-party components and all transitive dependencies must be confirmed to come from the expected repository (internal or external) with no risk of a dependency confusion attack. Verify NuGet (`nuget.org` only) and npm (`registry.npmjs.org` only) sources are pinned to official registries with no internal feed name collisions.

## 13.2 Defensive Coding

* `[L1]` `ASVS 5.0.0-15.3.1` API responses must only return the required subset of fields from a data object. Full data objects must not be returned if individual fields are not accessible to the requesting user.
* `[L2]` `ASVS 5.0.0-15.3.2` When the application backend makes calls to external URLs, it must be configured to not follow redirects unless that is intended functionality.
* `[L2]` `ASVS 5.0.0-15.3.3` The application must have countermeasures against mass assignment attacks by restricting allowed fields per controller and action. It must not be possible to insert or update a field value when it was not intended to be part of that action.
* `[L2]` `ASVS 5.0.0-15.3.4` All proxying and middleware components must transfer the user's original IP address using trusted data fields the end user cannot manipulate; the application must use that trusted value for logging and security decisions such as rate limiting. **Status: met today** — `ForwardedHeadersOptions` is configured in `Program.cs` with `ForwardLimit = 1` and empty `KnownProxies`/`KnownIPNetworks`, rather than an IP allowlist, since Render doesn't publish stable edge IPs for its Web Services. This is safe because Render's container is not directly reachable from the public internet (Render's edge is the sole intermediary), and `ForwardLimit = 1` means only the right-most `X-Forwarded-For` entry — the one Render's edge itself appends from the real TCP peer — is ever trusted; an end user cannot inject an earlier, attacker-controlled value into that position. Re-verify if a CDN or additional proxy is ever placed in front of Render's edge.
* `[L2]` `ASVS 5.0.0-15.3.7` The application must have defenses against HTTP parameter pollution, particularly where the framework doesn't distinguish the source of request parameters (query string, body, cookies, headers). Currently low-exposure (no list/array query parameters exist on any endpoint); re-verify if one is added.

---

# 14. Security Logging and Error Handling

> **Status: largely unimplemented today.** This section documents the target state. The application currently has no structured security-event logging — only ad-hoc `ILogger` informational messages (e.g. `AdminSeedService`). Treat this section the same way as the rate-limiting gap in §5.1/§2.4: a real, tracked requirement, not a compliance claim.

## 14.1 Security Logging Documentation

* `[L2]` `ASVS 5.0.0-16.1.1` An inventory must exist documenting the logging performed at each layer of the technology stack — what events are logged, log formats, where logs are stored, how they're used, how access is controlled, and retention period.

## 14.2 General Logging

* `[L2]` `ASVS 5.0.0-16.2.1` Each log entry must include metadata (when, where, who, what) sufficient for a detailed timeline investigation.
* `[L2]` `ASVS 5.0.0-16.2.2` Time sources for all logging components must be synchronized; timestamps must use UTC or an explicit time zone offset.
* `[L2]` `ASVS 5.0.0-16.2.3` The application must only store or broadcast logs to the files/services documented in the log inventory (14.1).
* `[L2]` `ASVS 5.0.0-16.2.4` Logs must be readable and correlatable by the log processor in use, preferably via a common logging format.
* `[L2]` `ASVS 5.0.0-16.2.5` Logging of sensitive data must respect that data's protection level — credentials/payment details must never be logged; tokens may only be logged hashed or masked.
* `[L1]` **Project rule (supplements 16.2.5; ties to ASVS 14.1.2 / 14.2.4):** Passwords, raw tokens, and full hashes must never appear in any log entry or audit record — in any field, including message text, structured properties, and the audit `detail` payload. Email is the only PII recorded in audit events, and deliberately so: it is the identifier needed to investigate authentication and delegated-administration activity. Because logs and audit records therefore contain email addresses, access to them falls under the access-control requirement for sensitive data in logs defined by ASVS 14.1.2 / 14.2.4 (see §12.1 / §12.2) and the log-protection controls in §14.4.

## 14.3 Security Events

* `[L2]` `ASVS 5.0.0-16.3.1` All authentication operations must be logged, including successful and unsuccessful attempts, with metadata such as the authentication method used.
* `[L2]` `ASVS 5.0.0-16.3.2` Failed authorization attempts must be logged.
* `[L2]` `ASVS 5.0.0-16.3.3` The application must log the security events defined in its documentation and attempts to bypass security controls (input validation, business logic, anti-automation). For this application, the events defined in documentation are the entries of the **Audit Event Catalog** below.
* `[L2]` `ASVS 5.0.0-16.3.4` Unexpected errors and security control failures (e.g. backend TLS failures) must be logged.

### Audit Event Catalog

The concrete set of security- and business-significant events this application is required to emit, satisfying the "events defined in documentation" requirement of 16.3.3. This catalog is informational documentation supplementing 16.3.3, not a new ASVS control. The event fields recorded must respect the never-log rule in §14.2 — outcome captures a reason *category*, never sensitive detail; email is the only PII recorded.

| Event | Trigger | Actor → Target |
|---|---|---|
| Login succeeded / failed | `POST /api/auth/login` | user (or anon + attempted identifier) |
| Logout | `POST /api/auth/logout` | user |
| Token refreshed / revoked / reuse-detected | `POST /api/auth/refresh` | user |
| Registration completed | `POST /api/auth/complete-registration` | user |
| Password reset requested / completed | `POST /api/auth/forgot-password`, `/reset-password` | user (or anon) |
| User created | `POST /api/users` | admin → new user |
| Invite generated / regenerated | create, `POST /api/users/{id}/invite` | admin → user |
| Roles changed (before → after) | `PATCH /api/users/{id}` | admin → user |
| User activated / deactivated | `PATCH …/activate`, `DELETE /api/users/{id}` | admin → user |
| User permanently deleted | `DELETE …/permanent` | admin → user |
| Authorization denied (403) | any admin endpoint | user → resource |

## 14.4 Log Protection

* `[L2]` `ASVS 5.0.0-16.4.1` All logging components must appropriately encode data to prevent log injection.
* `[L2]` `ASVS 5.0.0-16.4.2` Logs must be protected from unauthorized access and cannot be modified.
* `[L2]` `ASVS 5.0.0-16.4.3` Logs must be securely transmitted to a logically separate system for analysis, detection, alerting, and escalation, so that a breach of the application does not also compromise the logs.

## 14.5 Error Handling

* `[L2]` `ASVS 5.0.0-16.5.1` A generic message must be returned to the consumer on an unexpected or security-sensitive error, with no exposure of stack traces, queries, secret keys, or tokens. **Partially met:** `ApiExceptionHandler` only ever serializes `.Message` for known domain/validation exceptions; unhandled exceptions fall through to ASP.NET Core's default `ProblemDetails` pipeline. Re-verify this doesn't leak detail in the QA/Prod environment specifically (not just Development).
* `[L2]` `ASVS 5.0.0-16.5.2` The application must continue operating securely when external resource access fails (e.g. via circuit breakers or graceful degradation).
* `[L2]` `ASVS 5.0.0-16.5.3` The application must fail gracefully and securely, including on exceptions, preventing fail-open conditions such as processing a transaction despite a validation error.
* `[L3]` `ASVS 5.0.0-16.5.4` A "last resort" error handler must catch all unhandled exceptions, both to preserve error details for logging and to prevent an unhandled exception from taking down the whole process. **Status: already met** — `AddExceptionHandler<ApiExceptionHandler>()` + `AddProblemDetails()` in `Program.cs` provides exactly this; documented as verified-compliant.

---

# Appendix: Severity Reference for Reviews

When applying these standards in a security review, use the following severity mapping:

| Severity | Condition |
|----------|-----------|
| ❌ **Blocker** | L1 rule violated; L2 rule violated on a security-critical endpoint (auth, session, payment) |
| ⚠️ **Warning** | L2 rule violated on a lower-risk endpoint; documented deviation without sufficient rationale |
| 💡 **Suggestion** | Out-of-scope improvement, L3 consideration for future hardening, or a candidate new rule not yet in this document |

## Considered and declined (Level 3)

These L3 rules were evaluated against the current architecture and explicitly declined — recorded here so they're known to have been considered, not missed:

* **V2.3.5, V2.4.2** — multi-user approval / human-timing for high-value transactions: no such business-logic flows exist (no payments, no large-value operations).
* **V6.3.5–V6.3.7, V6.4.5, V6.4.6, V6.5.6–V6.5.8, V6.6.4, V6.7.1, V6.7.2** — MFA/biometric/push-notification/federated-assertion hardening: no MFA exists.
* **V7.5.3** — step-up re-authentication for sensitive transactions: no transaction class exists yet that's more sensitive than the already-`AdminPolicy`-gated admin actions.
* **V8.1.3, V8.1.4, V8.2.4, V8.4.2** — adaptive/contextual (time/location/device) authorization signals: no such risk-engine exists at this scale.
* **V11.1.3, V11.1.4, V11.3.4, V11.3.5, V11.5.2, V11.6.2, V11.7.1, V11.7.2** — cryptographic inventory tooling, post-quantum migration planning, nonce-reuse tracking, full memory encryption: enterprise/HSM-scale concerns not applicable to this app's Argon2id/HMAC-SHA256/SHA-256 usage.
* **V12.1.4, V12.1.5, V12.3.5** — OCSP stapling, Encrypted Client Hello, intra-service mTLS: TLS terminates at the hosting provider's edge, not in this application; not actionable from inside the repo.
* **V13.1.2–V13.1.4, V13.2.6, V13.3.3, V13.3.4** *(connection-pool/resource/secrets-rotation documentation, HSM-backed key storage)* — disproportionate to the current single-API, single-database architecture.
* **V14.2.7, V14.2.8** — data retention scheduling, file-metadata stripping: no file uploads exist; retention policy is a business decision, not a code change.
* **V15.1.4, V15.1.5, V15.2.5** — documenting/sandboxing "risky" third-party components: no component currently warrants that label.
* **V15.3.5, V15.3.6** — type-juggling/prototype-pollution defenses: not applicable to a statically-typed C# backend; low-likelihood on the vanilla-TS frontend given no dynamic object-literal merging of untrusted input exists today.
* **V15.4.1–V15.4.4** — multi-threaded shared-state race conditions, TOCTOU, thread starvation: the backend has no manually-managed shared mutable state across requests (DI is scoped/transient throughout); not applicable.

> **Source:** OWASP Application Security Verification Standard 5.0.0 (May 2025)
> **Scope:** L1 + L2 requirements (plus select, individually-tagged L3 rules) filtered to the Panorama Music stack (ASP.NET Core + React + JWT + PostgreSQL)
> **Out of scope (not applicable to this project):**
> - File uploads (V5), OAuth/OIDC authorization server (V10), GraphQL (V4.3), WebSockets (V4.4), WebRTC (V17) — no such features exist.
> - Memory-unsafe languages (V1.4) — the stack is .NET/TypeScript, both memory-safe.
> - JNDI injection (V1.3.8) — Java-specific (JNDI), not applicable to this .NET stack.
> - LaTeX injection (V1.2.8) — no LaTeX processing exists.
> - Rich-text/scriptable-content sanitization (V1.3.1 HTML/WYSIWYG, V1.3.4 SVG, V1.3.5 Markdown/CSS/XSL) — no rich-text or user-rendered-markup features exist yet; revisit if one is built.
> - Memcache injection (V1.3.9) — no memcache or similar cache layer is used.
> - Multi-factor authentication and federated identity (V6.3.3 relaxation, V6.4.4, V6.5.x, V6.6.x, V6.8.1/6.8.3/6.8.4, V7.1.3, V7.6.1) — single internal username/password auth only; no MFA, SSO, or SAML/OIDC identity-provider integration. Revisit if MFA or SSO is ever added.
> - Limited-quantity resource locking (V2.3.4) — no booking/inventory-style domain (e.g. lesson slots) exists yet; revisit if one is built.
> - Asymmetric key-generation algorithm selection (V11.6.1) — the application doesn't generate its own asymmetric keys; JWT signing uses a single symmetric HMAC-SHA256 key.
