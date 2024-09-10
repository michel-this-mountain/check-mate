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
                    title: "Where is the system used for? get Context.",
                    description: "Questions you can ask yourself: 1. what is a usecase of this system? 2. what is the purpose of this system? 3. what is the system used for?",
                    code: noCodeAvailable,
                    code_language: noCodeAvailableLanguage,
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "What technologies are being used by the web server?",
                    description: "Wappalyzer plugin, check headers, check sourcecode",
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
                    title: "Any known vulnerability of the version of the technology?",
                    description: "Think about public available PoC's",
                    code: noCodeAvailable,
                    code_language: noCodeAvailableLanguage,
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Is there any specialised scanner that can be ran on it? wpscan, joomscan etc.",
                    description: "check for specialised scanners",
                    code: `# wpscan - https://github.com/wpscanteam/wpscan 
# joomscan - https://github.com/OWASP/joomscan
# cmsmap - https://github.com/dionach/CMSmap
`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },{
                    title: "Run automated scanners, any interesting results?",
                    description: "Run automated scanners",
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
                    title: "Search for interesting files, check the 'associated code' for more info.",
                    description: "search for interesting files",
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
                    title: "Check for comments on the main and secondary pages. Anything interesting?",
                    description: "search for comments",
                    code: `# use the comment extractor tool under the 'enumeration tooling' tab`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Spider the website, any interesting files/folders?",
                    description: "retrieve all the files/ folders that are present on the webserver.",
                    code: `# using gospider
gospider -s <URL> | tee output.txt`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Bruteforce the website using gobuster/ dirbuster. Any interesting files or folders?",
                    description: "Look for directories that are interesting, text for extension that are relevant to the webapp, save things about: development, backups, testing, everything that stands out of the ordinary",
                    code: `# using gobuster
gobuster dir -u <URL> -x txt,jsp,html,js -w /usr/share/wordlists/dirb/common.txt -o test.txt`,
                    code_language: "language-bash",
                    rows: 2,
                    reference: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-web"
                },
                {
                    title: "Bruteforce for hidden parameters, what parameters are returning a response that differes in comparison to others?",
                    description: "Bruteforce for hidden parameters",
                    code: `# using gobuster
gobuster fuzz -u <URL>/FUZZ -w /usr/share/wordlists/dirb/common.txt --exclude-length 6821

# wordlist
# https://github.com/xsscx/Commodity-Injection-Signatures/blob/master/parameter/well-known-parameter-names-brute-force.txt
`,
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

// {
//     title: "",
//     description: "",
//     code: "",
//     code_language: "",
//     rows: 2,
//     reference: ""
// },