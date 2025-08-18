// /app/src/controllers/adminController.js

const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');

exports.scheduleInterview = async (req, res, next) => {
    try {
        const { candidateId, interviewType, jobRole, difficulty, sessionDeadline } = req.body;
        const scheduledById = req.user.id;

        if (!candidateId || !interviewType || !jobRole) {
            return res.status(400).json({ message: 'candidateId, interviewType, and jobRole are required.' });
        }

        const candidate = await User.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate user not found.' });
        }

        const newSession = await InterviewSession.create({
            candidateId,
            scheduledBy: scheduledById,
            interviewType,
            jobRole,
            difficulty,
            sessionDeadline,
            sessionBinding: crypto.randomUUID(),
            candidateIPAddress: 'scheduled',
        });

        logger.info(`Interview scheduled for candidate ${candidateId} by admin ${scheduledById}`);
        res.status(201).json({
            message: 'Interview scheduled successfully.',
            session: newSession
        });
    } catch (error) {
        next(error);
    }
};