/**
 * initChecklistAssistantContent()
 */
function initChecklistAssistantContent() {
    new CheckList(checklist.web_pentest_general.checklist_general, "checklist-assistant-web-pentest-general-accordion").buildChecklist()
    new CheckList(checklist.windows.checklist_privesc, "checklist-assistant-windows-privesc-accordion").buildChecklist()
}

/**
 * initChecklistAssistantContent()
 *
 * initiates all the checklists
 */

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
# https://wpscan.org
wpscan --url <URL> --enumerate u

# joomscan
//TODO !!
`,
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