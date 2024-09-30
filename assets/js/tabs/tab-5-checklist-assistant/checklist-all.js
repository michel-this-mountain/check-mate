/**
 * initChecklistAssistantContent()
 */
function initChecklistAssistantContent() {
    new CheckList(checklist.web_pentest_general.checklist_general, "checklist-assistant-web-pentest-general-accordion").buildChecklist()
    new CheckList(checklist.windows.checklist_privesc, "checklist-assistant-windows-privesc-accordion").buildChecklist()
}

const noCodeAvailable = "# no code available"
const noCodeAvailableLanguage = "language-bash"

const bash = "language-bash"
const powershell = "language-powershell"

const checklist = {
    windows: {
        checklist_privesc: [{
            chapter: "1. Initial Enumeration",
            checks: [
                {
                    title: "System enumeration - systeminfo",
                    description: "Gather information about the system",
                    code: `# gather information about the system
systeminfo

# gather specific information about the system
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration - wmic qfe (check installed patches)",
                    description: "wmic : windows management instrumentation commandline - return information about the system patches",
                    code: `# gather information about installed patches
wmic qfe

# filter on most important columns
wmic qfe Caption,Description,HotFixID,InstalledOn
`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration - wmic logialdisk",
                    description: "Gather information about the present drives on the machine",
                    code: `# list all drives
wmic logicaldisk

# list important sections
wmic logicaldisk get caption,description,providername 
                    `,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "User enumeration - users",
                    description: "Check who you are, and what privileges you have within the system",
                    code: `# check who you are on the system, check your privileges, 
# check your groups
whoami
whoami /priv
whoami /groups

# gather information about the users on this machine
net user

# gather information about a specific user 
net user <USERNAME>`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "User enumeration - groups",
                    description: "Check what groups are present, and which groups hold which users",
                    code: `# gather information about the groups on the system
net localgroup

# check which users are part of the administrator group
net localgroup Administrators`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "Network enumeration",
                    description: "Gather information about the network",
                    code: `# gather information on the network
ipconfig
ipconfig /all

# gather information about the arp table
arp -a

# gather information about the routing table
route print

# netstat 
netstat -ano`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "Password hunting (small)",
                    description: "Check for passwords in the current directory",
                    code: `Check for passwords in the current directory
findstr /si password *.txt
findstr /si password *.xml
findstr /si password *.ini

# find password string in config files
dir /s *pass* == *cred* == *vnc* == *.config*`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://sushant747.gitbooks.io/total-oscp-guide/content/privilege_escalation_windows.html"
                },
                {
                    title: "AV enumeration - programs",
                    description: "Gather information about the antivirus and services running",
                    code: `# show the services running
sc queryex type= service

# show a specific service running
sc query windefend`,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "AV enumeration - firewalls",
                    description: "Gather firewall configuration/ state of the firewall",
                    code: `# gather information about the firewall and open ports
netsh firewall show state 

# gather firewall config 
netsh firewall show config
                    `,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                }
            ]
        },
        {
            chapter: "2. Automated tooling",
            checks: [
                {
                    title: "WinPEAS",
                    description: "",
                    code: ``,
                    code_language: powershell,
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                }
            ]
        },

        ]
    },


    web_pentest_general: {
        checklist_general: [
            {
                chapter: "1. Recon (OSINT)",
                checks: [
                    {
                        title: "OSINT - Gather subdomains",
                        description: "Gather subdomains of the target domain.",
                        code: `# more tools can be found in the link
# navigate to the following website to find subdomains
https://crt.sh

# subfinder
subfinder -d example.com

# sublist3r
sublist3r -d example.com

# bbot (https://github.com/blacklanternsecurity/bbot)
bbot -t example.com -f subdomain-enum

# bbot (passive only)
bbot -t example.com -f subdomain-enum -rf passive
                        
# using theHarvester
theHarvester -d example.com -b all -l 200
`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/generic-methodologies-and-resources/external-recon-methodology#osint"
                    },

                    {
                        title: "OSINT - Gather SPF/DKIM/DMARC records of the target domain(s)",
                        description: "Gather SPF/DKIM/DMARC records of the target domain(s)",
                        code: `# using dig 
domain="example.com"
dig +short TXT \${domain} | grep 'v=spf1'
dig +short TXT _dmarc.\${domain} | grep 'v=DMARC1'
dig +short TXT default._domainkey.\${domain} | grep 'v=DKIM1'

# using mxtoolbox
https://mxtoolbox.com/
                        `,
                        code_language: bash,
                        rows: 2,
                        reference: "https://mxtoolbox.com/"
                    },
                    {
                        title: "OSINT - Check technologies used",
                        description: "Use either a online tool to check which technologies are used.",
                        code: `# builtwith
https://builtwith.com/`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://builtwith.com/"
                    },
                    {
                        title: "OSINT - Google Dork",
                        description: "Try to find information about the target domain.",
                        code: `# use the build-in tool/ query the following commands
# find exposed directories
site:example.com intitle:"index of"

# search for specific file types
site:example.com filetype:pdf | filetype:doc | filetype:xls

# locate configuration files
site:example.com ext:conf | ext:cnf | ext:config | ext:ini | ext:env

# find pages containing sensitive keywords
site:example.com intext:"password" | intext:"username" | intext:"login"

# discover publicy accessible backup and old files
site:example.com ext:bak | ext:old | ext:backup | ext:sql
                        `,
                        code_language: bash,
                        rows: 2,
                        reference: "https://www.exploit-db.com/google-hacking-database"
                    },
                    {
                        title: "OSINT - Metadata extraction",
                        description: "Retrieve PDFs, images, or documents from the target's website.",
                        code: `# Use tools like ExifTool to extract 
# metadata which may reveal usernames, 
# software versions, or internal paths.
exiftool <file>
                        `,
                        code_language: bash,
                        rows: 2,
                        reference: "https://exiftool.org/"
                    },
                    {
                        title: "OSINT - Public Code Repositories",
                        description: "Search public code repositories like GitHub or GitLab for information related to the target organization.",
                        code: `# Search GitHub for repositories belonging to the target organization
# Replace 'exampleorg' with the organization's GitHub username
https://github.com/exampleorg

# Use GitHub's advanced search to find mentions of the target domain
# Replace 'example.com' with the target domain
https://github.com/search?q=example.com&type=Code

# Clone a repository of interest
git clone https://github.com/exampleorg/repository-name.git

# Use tools like 'gitdumper' to dump exposed '.git' directories from websites
# Install GitTools: https://github.com/internetwache/GitTools
gitdumper https://example.com/.git/ /path/to/dump/
                        `,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/generic-methodologies-and-resources/external-recon-methodology#code-repositories"
                    },
                    {
                        title: "OSINT - Gather email addresses/ passwords",
                        description: "Use tools like email-finder to find email addresses/passwords related to the target domain.",
                        code: `# anymailfinder
https://newapp.anymailfinder.com/search/single

# using theHarvester
theHarvester -d example.com -b all -l 200

# tool that has a DB leak of username/password combinations
https://www.proxynova.com/tools/comb/

# using breachparse for DB leak
https://github.com/hmaverickadams/breach-parse
`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/generic-methodologies-and-resources/external-recon-methodology"
                    },
                    {
                        title: "OSINT - OSINTFRAMEWORK",
                        description: "Use the OSINTFRAMEWORK to check for information about the target domain.",
                        code: `https://osintframework.com/`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://osintframework.com/"
                    },
                    {
                        title: "OSINT - TOOLS",
                        description: "Use tools to help with gathering OSINT information.",
                        code: `# rengine
https://github.com/yogeshojha/rengine

# Osmedeus
https://github.com/j3ssie/Osmedeus

# reconftw
https://github.com/six2dez/reconftw
`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/generic-methodologies-and-resources/external-recon-methodology"
                    }
                ]
            }, {
                chapter: "2. Enumeration",
                checks: [
                    {
                        title: "Understand System Context",
                        description: "Identify the system's purpose, use cases, and functionality.",
                        code: noCodeAvailable,
                        code_language: noCodeAvailableLanguage,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Identify Web Server Technologies",
                        description: "Use Wappalyzer, check headers and source code to determine technologies in use.",
                        code: `# 1
whatweb -a 1 <IP> # stealthy

# 2
whatweb -a 3 <IP> # aggressive

# 3
# use wappalyzer plugin in browser`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Check for Known Vulnerabilities",
                        description: "Research and identify any public PoCs for the detected technologies.",
                        code: noCodeAvailable,
                        code_language: noCodeAvailableLanguage,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Run Specialized Scanners",
                        description: "Utilize technology-specific scanners like wpscan, joomscan, etc.",
                        code: `# wpscan - https://github.com/wpscanteam/wpscan 
# joomscan - https://github.com/OWASP/joomscan
# cmsmap - https://github.com/dionach/CMSmap
`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    }, {
                        title: "Execute Automated Scans",
                        description: "Run various automated scanners and analyze results for vulnerabilities.",
                        code: `nikto -h <URL>
whatweb -a 4 <URL>
wapiti -u <URL>
zaproxy #You can use an API
nuclei -ut && nuclei -target <URL>`,
                        code_language: "#",
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Locate Interesting Files",
                        description: "Search for common files that may contain sensitive information.",
                        code: `/robots.txt
/sitemap.xml
/crossdomain.xml
/clientaccesspolicy.xml
/.well-known/`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Analyze Page Comments",
                        description: "Examine HTML comments on main and secondary pages for sensitive data.",
                        code: `# use the comment extractor tool under the 'enumeration tooling' tab`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Spider the Website",
                        description: "Map out the website structure and identify potentially interesting files/folders.",
                        code: `# using gospider
gospider -s <URL> | tee output.txt`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Directory and File Brute-forcing",
                        description: "Use tools like gobuster to discover hidden directories and files, focusing on development, backups, and testing areas.",
                        code: `# using gobuster
gobuster dir -u <URL> -x txt,jsp,html,js -w /usr/share/wordlists/dirb/common.txt -o test.txt`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Bruteforce for hidden parameters",
                        description: "Identify parameters that return different responses compared to others",
                        code: `# Using Gobuster for parameter fuzzing
gobuster fuzz -u <URL>?FUZZ=test -w /path/to/parameter/wordlist.txt -b 200

# Using Arjun for parameter discovery
# https://github.com/s0md3v/Arjun
arjun -u <URL> -w /path/to/parameter/wordlist.txt`,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },
                    {
                        title: "Check for vulnerabilities in identified user input endpoints",
                        description: "Once you have identified all the possible endpoints accepting user input, check for all kind of vulnerabilities related to it",
                        code: noCodeAvailable,
                        code_language: bash,
                        rows: 2,
                        reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                    },


                ]
            }],
    },
}


// ,
//                     {
//                         title: "",
//                         description: "",
//                         code: noCodeAvailable,
//                         code_language: noCodeAvailableLanguage,
//                         rows: 2,
//                         reference: ""
//                     }