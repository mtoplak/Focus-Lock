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
}
