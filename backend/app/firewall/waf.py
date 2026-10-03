import re
import urllib.parse
from typing import Optional, Tuple


class WAFEngine:
    """
    Enterprise-Grade Web Application Firewall (WAF) deep packet inspection engine.
    Defends against OWASP Top 10 web application vulnerabilities including:
      - A03: SQL Injection (SQLi), Blind Time-Based, Stacked Queries
      - A03: Cross-Site Scripting (XSS), Stored, Reflected, DOM
      - A03: Path Traversal & Local File Inclusion (LFI)
      - A03: OS Command Injection & Shell Metacharacters
      - A08: XML External Entity (XXE) & Insecure Deserialization / Log4j
      - A10: Server-Side Request Forgery (SSRF) / Cloud Metadata Exfiltration
    """

    # 1. Path Traversal & Local File Inclusion (LFI) Signatures
    PATH_TRAVERSAL_REGEX = re.compile(
        r"(\.\./|\.\.\\|%2e%2e|%252e%252e|\.\.;/|\.\.%2f|\.\.%5c|%00|\x00|"
        r"/etc/(passwd|shadow|group|hosts|issue)|/proc/(self|version)|"
        r"\b(win|boot)\.ini|[c-z]:[\\/]windows|/system32/)",
        re.IGNORECASE,
    )

    # 2. Cross-Site Scripting (XSS) Signatures
    XSS_REGEX = re.compile(
        r"(<\s*(script|iframe|object|embed|svg|img|audio|video|style|body|marquee|details|base)\b|"
        r"</\s*(script|iframe|object|embed|svg)\b|"
        r"\bon(error|load|click|mouseover|focus|blur|submit|change|pageshow|unload|mouseenter|mouseleave|keydown|keyup)\s*=|"
        r"\b(javascript|vbscript|data\s*:\s*text/html)\s*:|"
        r"\b(alert|confirm|prompt|eval|document\.cookie|document\.location|window\.location|document\.write)\s*\()",
        re.IGNORECASE,
    )

    # 3. SQL Injection (SQLi) Signatures
    SQLI_REGEX = re.compile(
        r"(\bunion\s+(all\s+)?select\b|"
        r"\bselect\s+.*\s+from\b|"
        r";\s*(drop\s+(table|database)|truncate\s+table|alter\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b|"
        r"\bexec(\s+|\()|"
        r"(['\"]?\s*(or|and)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+|'\s*or\s*['\"]?1['\"]?\s*=\s*['\"]?1|1\s*=\s*1\b)|"
        r"\b(waitfor\s+delay|pg_sleep|sleep|benchmark)\s*\(|"
        r"/\*.*?\*/|--\s*-|;\s*shutdown\b|"
        r"\binformation_schema\b|\bsys\.tables\b)",
        re.IGNORECASE,
    )

    # 4. OS Command Injection Signatures
    CMD_REGEX = re.compile(
        r"(;\s*(cat|rm|ls|id|whoami|sh|bash|nc|netcat|curl|wget|python|perl|ruby|uname|chmod|sudo)\b|"
        r"\|\s*(cat|rm|ls|id|whoami|sh|bash|nc|curl|wget|uname)\b|"
        r"&&\s*(cat|rm|id|whoami|sh|bash|curl|wget)\b|"
        r"\$\([^)]+\)|\`[^`]+\`|\$\{IFS\}|"
        r"\bpowershell(\.exe)?\b|\bcmd(\.exe)?\s*/c)",
        re.IGNORECASE,
    )

    # 5. XXE, Insecure Deserialization & JNDI / Log4j Injection Signatures (OWASP A08)
    XXE_JNDI_REGEX = re.compile(
        r"(<!DOCTYPE\s+[^>]*\[|<!ENTITY\s+[^>]+(SYSTEM|PUBLIC)|"
        r"\$\{jndi:(ldap|rmi|dns|nis|iiop):|"
        r"__proto__|constructor\s*\[\s*['\"]prototype['\"]\])",
        re.IGNORECASE,
    )

    # 6. SSRF Cloud Metadata Probe Signatures (OWASP A10)
    SSRF_METADATA_REGEX = re.compile(
        r"(169\.254\.169\.254|100\.100\.100\.200|metadata\.google\.internal|instance-data/latest)",
        re.IGNORECASE,
    )

    @classmethod
    def inspect(
        cls,
        path: str,
        query_string: str = "",
        body_bytes: bytes = b"",
        content_length: int = 0,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Inspects incoming request components for abnormal or malicious activity.
        Returns:
            (is_threat, attack_type, match_detail)
        """
        # 1. Payload Size Limit check (e.g. > 10MB payload probe / buffer exhaustion)
        if content_length > 10 * 1024 * 1024 or len(body_bytes) > 10 * 1024 * 1024:
            return True, "OVERSIZED_PAYLOAD", f"Payload size ({content_length or len(body_bytes)} bytes) exceeds 10MB safety limit"

        # 2. Query String Length check (e.g. buffer overflow attempt)
        if len(query_string) > 2048:
            return True, "EXCESSIVE_QUERY_LENGTH", f"Query string length ({len(query_string)} chars) exceeds 2048 limit"

        # Multi-layer URL decoding to counter recursive encoding evasion (%252e -> %2e -> .)
        try:
            decoded_path = urllib.parse.unquote(path)
            decoded_path = urllib.parse.unquote(decoded_path)
        except Exception:
            decoded_path = path

        try:
            decoded_query = urllib.parse.unquote(query_string)
            decoded_query = urllib.parse.unquote(decoded_query)
        except Exception:
            decoded_query = query_string

        body_text = ""
        if body_bytes and len(body_bytes) < 131072:
            try:
                body_text = body_bytes.decode("utf-8", errors="ignore")
                body_text = urllib.parse.unquote(body_text)
            except Exception:
                body_text = ""

        # Check Path Traversal (path, decoded path, query)
        for target in (path, decoded_path, decoded_query):
            m = cls.PATH_TRAVERSAL_REGEX.search(target)
            if m:
                return True, "PATH_TRAVERSAL", m.group(0)

        # Check XSS (path, query, body)
        for target in (decoded_path, decoded_query, body_text):
            if target:
                m = cls.XSS_REGEX.search(target)
                if m:
                    return True, "XSS_ATTACK", m.group(0)

        # Check SQL Injection (query, body)
        for target in (decoded_query, body_text):
            if target:
                m = cls.SQLI_REGEX.search(target)
                if m:
                    return True, "SQL_INJECTION", m.group(0)

        # Check Command Injection (path, query, body)
        for target in (decoded_path, decoded_query, body_text):
            if target:
                m = cls.CMD_REGEX.search(target)
                if m:
                    return True, "COMMAND_INJECTION", m.group(0)

        # Check XXE / Deserialization / Log4j (query, body)
        for target in (decoded_query, body_text):
            if target:
                m = cls.XXE_JNDI_REGEX.search(target)
                if m:
                    return True, "INTEGRITY_VIOLATION", m.group(0)

        # Check SSRF Cloud Metadata Probing (path, query, body)
        for target in (decoded_path, decoded_query, body_text):
            if target:
                m = cls.SSRF_METADATA_REGEX.search(target)
                if m:
                    return True, "SSRF_ATTEMPT", m.group(0)

        return False, None, None
