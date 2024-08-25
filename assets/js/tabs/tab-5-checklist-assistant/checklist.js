/**
 * initChecklistAssistantContent()
 *
 * initiates all the checklists
 */

const checklist = {
    windows: {
        checklist_privesc: [{
            chapter: "1. Enumeration",
            checks: [
                {
                    title: "System enumeration: systeminfo",
                    description: "test description 1 enumeration",
                    notes: "",
                    code: `systeminfo; ls`,
                    code_language: "language-powershell",
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration: systeminfo",
                    description: "test description 2 enumeration",
                    notes: "",
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
                    notes: "",
                    code: "systeminfo",
                    code_language: "language-powershell",
                    code_available: true,
                    rows: 2,
                    reference: "https://academy.tcm-sec.com/courses/1154361/lectures/24794929"
                },
                {
                    title: "System enumeration: systeminfofsdf s fsdfsdfsd fsd fsd fsd fs dfsdf  ansdb amnsbd mansbd amnbd mansbd mansbd mnasb dmnasb dmnasbd mansb dmnasbd ",
                    description: "test description 2",
                    notes: "",
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
    }
}