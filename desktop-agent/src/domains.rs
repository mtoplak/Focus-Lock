use std::collections::HashSet;

/// Normalize a user-entered domain or DNS query name.
pub fn normalize_host(raw: &str) -> Option<String> {
    let mut s = raw.trim().to_ascii_lowercase();
    if s.is_empty() {
        return None;
    }
    if s.ends_with('.') {
        s.pop();
    }
    let s = s
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("//");
    let s = s.split('/').next().unwrap_or(&s);
    let s = s.split(':').next().unwrap_or(&s);
    let s = s.trim_start_matches("www.");
    if s.is_empty() {
        return None;
    }
    Some(s.to_string())
}

/// If `query_name` matches a blocked domain, return the canonical blocked key to count.
pub fn match_blocked_domain(query_name: &str, blocked: &HashSet<String>) -> Option<String> {
    let name = normalize_host(query_name)?;
    for domain in blocked {
        let bare = normalize_host(domain)?;
        if name == bare {
            return Some(bare);
        }
        if name == format!("www.{bare}") {
            return Some(bare);
        }
        if name.ends_with(&format!(".{bare}")) {
            return Some(bare);
        }
    }
    None
}

pub fn canonical_key(domains: &HashSet<String>) -> String {
    let mut v: Vec<String> = domains.iter().filter_map(|d| normalize_host(d)).collect();
    v.sort();
    v.dedup();
    v.join(",")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_host_strips_url_parts_and_www() {
        assert_eq!(
            normalize_host("https://www.YouTube.com/watch?v=1"),
            Some("youtube.com".into())
        );
        assert_eq!(normalize_host("http://reddit.com:443/path"), Some("reddit.com".into()));
        assert_eq!(normalize_host("  "), None);
        assert_eq!(normalize_host("example.com."), Some("example.com".into()));
    }

    #[test]
    fn matches_subdomains() {
        let blocked: HashSet<String> = ["youtube.com".into()].into_iter().collect();
        assert_eq!(
            match_blocked_domain("www.youtube.com.", &blocked),
            Some("youtube.com".into())
        );
        assert_eq!(
            match_blocked_domain("m.youtube.com", &blocked),
            Some("youtube.com".into())
        );
        assert_eq!(match_blocked_domain("google.com", &blocked), None);
    }

    #[test]
    fn does_not_match_bare_domain_as_subdomain_of_longer_block() {
        let blocked: HashSet<String> = ["notyoutube.com".into()].into_iter().collect();
        assert_eq!(match_blocked_domain("youtube.com", &blocked), None);
        assert_eq!(
            match_blocked_domain("foo.notyoutube.com", &blocked),
            Some("notyoutube.com".into())
        );
    }

    #[test]
    fn canonical_key_sorts_and_deduplicates() {
        let blocked: HashSet<String> = [
            "youtube.com".into(),
            "reddit.com".into(),
            "youtube.com".into(),
            "WWW.reddit.com".into(),
        ]
        .into_iter()
        .collect();
        assert_eq!(canonical_key(&blocked), "reddit.com,youtube.com");
    }
}
