const { PrismaClient } = require('@prisma/client');
const { scoreSubmission } = require('../src/lib/assessment-ai');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
    const instances = await prisma.testInstance.findMany({
        where: {
            OR: [
                { scoringStatus: 'scoring' },
                { scoringStatus: 'pending' }
            ]
        },
        include: {
            answers: true,
            assessment: {
                include: { questions: true },
            },
        },
    });

    console.log(`Found ${instances.length} instances to score.`);

    for (const instance of instances) {
        console.log(`Scoring instance: ${instance.id}...`);

        try {
            await prisma.testInstance.update({
                where: { id: instance.id },
                data: { scoringStatus: 'scoring' },
            });

            const questions = instance.assessment.questions.map(q => ({
                id: q.id,
                stage: q.stageIndex,
                type: q.questionType,
                prompt: q.promptText,
                options: q.options,
            }));

            const answers = instance.answers.map(a => ({
                questionId: a.questionId,
                answerText: a.answerText || '',
                selectedOptionId: a.selectedOptionId || '',
            }));

            const { scoring, rawResponse } = await scoreSubmission(questions, answers);

            await prisma.testInstance.update({
                where: { id: instance.id },
                data: {
                    scoringStatus: 'scored',
                    scoringResult: rawResponse,
                    recommendation: scoring.recommendation,
                },
            });

            console.log(`✅ Completed scoring for ${instance.id}. Rec: ${scoring.recommendation}`);
        } catch (err) {
            console.error(`❌ Error scoring ${instance.id}:`, err);
            await prisma.testInstance.update({
                where: { id: instance.id },
                data: { scoringStatus: 'error' },
            });
        }
    }
    console.log('Done!');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
