/**
 * initChecklistAssistantContent()
 */
function initChecklistAssistantContent() {
    new CheckList(checklist.web_pentest_general.checklist_general, "checklist-assistant-web-pentest-general-accordion").buildChecklist()
    new CheckList(checklist.windows.checklist_privesc, "checklist-assistant-windows-privesc-accordion").buildChecklist()
}

const noCodeAvailable = "# no code available"
const noCodeAvailableLanguage = "language-bash"

const checklist = {
    windows: {
        checklist_privesc: [{
            chapter: "1. Enumeration",
            checks: [
                {
                    title: "System enumeration: systeminfo",
                    description: "test description 1 enumeration",
                    code: `systeminfo; ls`,
                    code_language: "language-powershell",
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration: systeminfo",
                    description: "test description 2 enumeration",
                    code: "systeminfo",
                    code_language: "language-powershell",
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
            ]
        },
            {
                chapter: "2. test",
                checks: [
                    {
                        title: "System enumeration: systeminfo",
                        description: "test description 1",
                        code: "systeminfo",
                        code_language: "language-powershell",
                        code_available: true,
                        rows: 2,
                        reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                    },
                    {
                        title: "System enumeration: systeminfofsdf s fsdfsdfsd fsd fsd fsd fs dfsdf  ansdb amnsbd mansbd amnbd mansbd mansbd mnasb dmnasb dmnasbd mansb dmnasbd ",
                        description: "test description 2",
                        code: `#!/bin/bash
# A simple variable example
greeting=Hello
name=Tux
var=$((3+9))
echo $greeting $name $var

if [ $a == $b -a $b == $c -a $a == $c ]
then
echo EQUILATERAL

elif [ $a == $b -o $b == $c -o $a == $c ]
then 
echo ISOSCELES
else
echo SCALENE

fi

i=1
while [[ $i -le 10 ]] ; do
   echo "$i"
  (( i += 1 ))
done

#Executing commands with back ticks(or \`\`)
var=\`df -h | grep tmpfs\`
echo $var
`,
                        code_language: "language-bash",
                        code_available: true,
                        rows: 2,
                        reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                    },
                ]
            }]
    },
    web_pentest_general: {
        checklist_general: [{
            chapter: "1. Enumeration",
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
                    code_language: "language-bash",
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
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },{
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
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Analyze Page Comments",
                    description: "Examine HTML comments on main and secondary pages for sensitive data.",
                    code: `# use the comment extractor tool under the 'enumeration tooling' tab`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Spider the Website",
                    description: "Map out the website structure and identify potentially interesting files/folders.",
                    code: `# using gospider
gospider -s <URL> | tee output.txt`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Directory and File Brute-forcing",
                    description: "Use tools like gobuster to discover hidden directories and files, focusing on development, backups, and testing areas.",
                    code: `# using gobuster
gobuster dir -u <URL> -x txt,jsp,html,js -w /usr/share/wordlists/dirb/common.txt -o test.txt`,
                    code_language: "language-bash",
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
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Once you have identified all the possible endpoints accepting user input, check for all kind of vulnerabilities related to it",
                    description: "TODO",
                    code: `TODO`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },


            ]
        }],
    },
}