chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("HELPPS")
      if (request.action === "fillForm") {
          collectFormElementsMultipleChoice();
          sendResponse({status: "Form filled"});
      }
    }
  );

  // loops through all questions and each of their options and clicks them
async function fillForm(questions, questionIds, submitButtons) {
    console.log(questionIds);
    for (const questionId of questionIds) {
        const qs = questions[questionId];
        console.log(qs);
        for (const q of qs) {
            document.getElementById(q.id).click();
            await delay(500);
            document.getElementById(submitButtons[0].id).click();
        }
    }
    document.getElementById(submitButtons[0].id).click();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// collects the input questions, the questionIds, and submit buttons
// numToIds: {32788995 : {questions[32788995][0], questions[32788995][1]} }
// questionIds: {questions[32788995][0], questions[32788995][1], ...}
// questions: {questions[32788995][0] : [{id="questions_32788995__0_True" name="questions[32788995][0]"value="True"}, ...]}
async function collectFormElementsMultipleChoice() {
    // maps question id to question info
    const questions = {};
    // set of all questionIds
    const questionIds = new Set();
    // submit buttons
    const submitButtons = [];

    // dict mapping question number to all its ids
    const numToIds = {};

     // Collect all radio button inputs
     // <input type="radio" id="questions_32788995__0_True" name="questions[32788995][0]" tabindex="-1" value="True">
    const radioButtons = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    radioButtons.forEach(button => {
        // Assuming the id or name attributes contain information about question grouping
        questionIds.add(button.name);
        
        // maps button name to list of options info
        if (!(button.name in questions)) {
            questions[button.name] = [];
        }
        questions[button.name].push({
            id: button.id,
            name: button.name,
            value: button.value,
            type: button.type
        });

        // numberToIds
        // uses this match regex to select for number(32788995) from: questions[32788995][0]
        var number = button.name.match(/\[(\d+)\]/);
        if (number) {
            number = number[1]; // "32788592" as a string
            console.log(number);
            if (!(number in numToIds)) {
                numToIds[number] = new Set();
            }
            numToIds[number].add(button.name);
        }

    });

    // Collect all submit buttons based on a class pattern
    // Adjust ".tiiBtn.tiiBtn-primary" if necessary to match the actual buttons in your form
    const buttons = document.querySelectorAll('button.tiiBtn.tiiBtn-primary');
    buttons.forEach(button => {
        submitButtons.push({
            id: button.id,
            text: button.innerText
        });
    });

    // Log or return the collected elements
    console.log("Questions:", questions);
    console.log("question Ids", questionIds);
    console.log("Submit Buttons:", submitButtons);
    console.log("numToIds", numToIds);

    // fillForm(questions, questionIds, submitButtons);
    for (const num of Object.keys(numToIds)) {
        await exploreAllCombinations(num, questions, numToIds, submitButtons[0]);
    }

    

    return { questions, questionIds, submitButtons, numToIds };

}

// create 2d array of all options for a question
async function generatePermutations(options, depth, current, all) {
    if (depth === options.length) {
        all.push([...current]);
        return;
    }

    for (let i = 0; i < options[depth].length; i++) {
        current[depth] = options[depth][i];
        generatePermutations(options, depth + 1, current, all);
    }
}

// generates all the SATA combinations
async function generateSATACombinations(options) {
    let combinations = [[]]; // Start with an empty combination
    for (let i = 0; i < options.length; i++) {
        let newCombinations = [];
        // For each existing combination, add one without the current option and one with it
        combinations.forEach(comb => {
            newCombinations.push([...comb]); // Not including the current option
            newCombinations.push([...comb, options[i].id]); // Including the current option
        });
        combinations = newCombinations; // Update the list of combinations
    }
    return combinations;
}

// actually try each option
async function fillAllCombinations(options, button, qNum) {
    const qid = "question_" + qNum;
    const bid = "submit_question_" + qNum;
    var clicked = false;

    // Preliminary check just in case answer is already correct
    const initialCheck = await checkForExplanation(qid);
    if (initialCheck) {
        console.log("YES CORRECT ANSWER FOUND");
        return;
    }

    // Assume all options within a single question group are of the same type (all checkboxes for SATA)
    // Fetch all checkboxes related to this question group to reset them before each permutation
    // This selector might need adjustment to precisely target your checkboxes
    const allCheckboxes = document.querySelectorAll(`#${qid} input[type='checkbox']`);

    for (const permutation of options) {
        // Reset all checkboxes before applying the new permutation
        allCheckboxes.forEach(checkbox => {
            if (checkbox.checked === true) {
                checkbox.click();
            }
        });

        console.log("permutation: ", permutation)
        // Apply the new permutation by checking the required options
        for (const choiceId of permutation) {
            const choiceElement = document.getElementById(choiceId);
            // click the element
            console.log("choiceEleemtn: ", choiceElement)
            if (choiceElement) {
                choiceElement.click();
            }
        }

        if (!clicked) {
            scrollToElement(document.getElementById(bid));
            clicked = true;
        }
        console.log("PRESSING BUTTON: ", bid)
        document.getElementById(bid).click();
        
        try {
            // Wait for the button to become re-enabled
            await waitForButtonToEnable(bid);    
            // Check for the explanation or other indicators of success/failure
            const checkResult = await checkForExplanation(qid);
            if (checkResult) {
                console.log("CORRECT ANSWER FOUND");
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }
    console.log("finished fillAllCombos for: ", qid);
}


// checks if there is an explanation element present in the question div
async function checkForExplanation(questionId) {
    // Assuming `questionId` is the id attribute value of the question container div.
    const questionDiv = document.getElementById(questionId);
    if (questionDiv) {
        // Check if there's a div with class 'question--feedbackContainer' within this question.
        const explanationDiv = questionDiv.querySelector('.question--feedbackContainer');
        if (explanationDiv) {
            return true; // Explanation is present
        } else {
            return false; // Explanation is not present
        }
    } else {
        console.log('Question not found:', questionId);
        return false; // Question div itself not found
    }
}

function scrollToElement(element) {
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth', // This enables smooth scrolling
            block: 'center', // This centers the element in the viewport
            inline: 'nearest'
        });
    }
}
// TEST
function generateCombinations(optionsList, depth = 0, currentCombination = [], allCombinations = []) {
    // Base case
    if (depth === optionsList.length) {
        allCombinations.push([...currentCombination]);
        return;
    }

    const currentOptions = optionsList[depth];
    // Check if it's a single-choice question (MCQ)
    if (currentOptions[0].type === 'radio') {
        for (const option of currentOptions) {
            currentCombination[depth] = option.id;
            generateCombinations(optionsList, depth + 1, currentCombination, allCombinations);
            currentCombination.pop();
        }
    } else { // Handling SATA: "checkbox"
        // Generate combinations including and excluding each option
        // This step ensures every possible combination of selections is considered
        const generateForSATA = (index = 0, combo = []) => {
            if (index === currentOptions.length) {
                // Once all options are considered, push the current combo and return
                generateCombinations(optionsList, depth + 1, [...currentCombination, ...combo], allCombinations);
                return;
            }
            // Exclude current option
            generateForSATA(index + 1, combo);
            // Include current option
            generateForSATA(index + 1, [...combo, currentOptions[index].id]);
        };
        generateForSATA();
    }
}


async function exploreAllCombinations(qNum, questions, numToIds, submitButton) {
    // need to create list of options ids for each question
    const combinations = [];

    for (const qid of numToIds[qNum]) {
        const temp = [];
        for (const option of questions[qid]) {
            temp.push(option);
        }
        combinations.push(temp);
    }
    console.log("COMBOS", combinations);


    let allCombinations = [];
    // await generatePermutations(combinations, 0, [], allCombinations);
    generateCombinations(combinations, 0, [], allCombinations);

    console.log("All combinations:", allCombinations);
    console.log("Total combinations:", allCombinations.length);

    // Here you would iterate over `allCombinations` to programmatically set the choices and observe the outcomes
    await fillAllCombinations(allCombinations, submitButton, qNum);
}


function waitForButtonToEnable(buttonId) {
    return new Promise((resolve, reject) => {
        const button = document.getElementById(buttonId);

        // Immediately resolve if the button is already enabled
        if (!button.disabled) {
            resolve();
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled' && !button.disabled) {
                    observer.disconnect(); // Stop observing
                    resolve(); // Resolve the promise
                }
            });
        });

        observer.observe(button, {
            attributes: true, // Watch for attribute changes
        });

        // Reject the promise if the button doesn't enable within a certain timeout
        setTimeout(() => {
            observer.disconnect();
            reject(new Error('Button did not re-enable within the timeout period.'));
        }, 10000); // Adjust timeout as needed
    });
}
