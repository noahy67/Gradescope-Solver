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
    const radioButtons = document.querySelectorAll('input[type="radio"]');
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
            value: button.value
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

// actually try each option
async function fillAllCombinations(options, button, qNum) {
    const qid = "question_" + qNum;
    const bid = "submit_question_" + qNum;
    var clicked = false;
    for (const permutation of options) {
        for (const choice of permutation) {
            document.getElementById(choice).click();
        }
        if (!clicked) {
            scrollToElement(document.getElementById(bid));
            clicked = true;
        }
        document.getElementById(bid).click();
        await delay(500);
        const res = await checkForExplanation(qid);
        if (res) {
            console.log("YES CORRECT ANSWER FOUND");
            return;
        }
    }
    console.log("finished fillAllCombos for: ", qid);
}

// checks if there is an explanation element present in the question div
async function checkForExplanation(questionId) {
    // Assuming `questionId` is the id attribute value of the question container div.
    console.log("checkForExp qid: ", questionId);
    const questionDiv = document.getElementById(questionId);
    if (questionDiv) {
        // Check if there's a div with class 'question--feedbackContainer' within this question.
        const explanationDiv = questionDiv.querySelector('.question--feedbackContainer');
        if (explanationDiv) {
            console.log('Explanation found for question:', questionId);
            return true; // Explanation is present
        } else {
            console.log('No explanation found for question:', questionId);
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


async function exploreAllCombinations(qNum, questions, numToIds, submitButton) {
    // Example: 4 questions each with 4 options (A, B, C, D)
    const options = [
        ['A', 'B', 'C', 'D'], // Choices for question 1
        ['A', 'B', 'C', 'D'], // Choices for question 2
        ['A', 'B', 'C', 'D'], // Choices for question 3
        ['A', 'B', 'C', 'D']  // Choices for question 4
    ];

    // need to create list of options ids for each question
    const combinations = [];

    for (const qid of numToIds[qNum]) {
        const temp = [];
        for (const option of questions[qid]) {
            temp.push(option.id);
        }
        combinations.push(temp);
    }
    console.log("COMBOS", combinations);


    let allCombinations = [];
    await generatePermutations(combinations, 0, [], allCombinations);

    console.log("All combinations:", allCombinations);
    console.log("Total combinations:", allCombinations.length);

    // Here you would iterate over `allCombinations` to programmatically set the choices and observe the outcomes
    await fillAllCombinations(allCombinations, submitButton, qNum);
}

  