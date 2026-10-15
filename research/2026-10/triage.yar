// Heuristics for analyst triage, never a malware verdict.
rule Vardr_SSH_AuthorizedKeys_Reference {
    strings: $path = "authorized_keys" ascii
    condition: $path
}
rule Vardr_Downloader_Reference {
    strings: $curl = "curl " ascii $wget = "wget " ascii
    condition: any of them
}
rule Vardr_Persistence_Path_Reference {
    strings: $cron = "/etc/cron" ascii $systemd = "/etc/systemd/" ascii
    condition: any of them
}
