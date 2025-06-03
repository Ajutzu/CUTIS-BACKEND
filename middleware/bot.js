

export const chatBot = async (req, res, next) => {
    try {
        const { message } = req.body;

        // Define common user queries and their predefined responses
        const predefinedResponses = {
                    login: {
                        keywords: ['how to login', 'cant login', 'login problem', 'sign in'],
                        response: 'To login, go to the login page and enter your email and password. If you forgot your password, use the "Forgot Password" link to reset it.'
                    },
                    skinDetection: {
                        keywords: ['skin detection', 'detect skin', 'analyze skin', 'scan skin'],
                        response: 'To use the skin detection feature: 1. Login to your account 2. Go to "Skin Analysis" section 3. Upload a clear photo of your skin condition 4. Wait for the analysis results.'
                    },
                    navigation: {
                        keywords: ['how to find', 'where is', 'cant find', 'navigate'],
                        response: 'You can use the navigation menu at the top of the page to access different features. For specific features, check the dashboard for quick access links.'
                    },
                    upload: {
                        keywords: ['upload', 'photo', 'drag', 'upload photo'],
                        response: 'To upload a photo, simply drag and drop the photo into the upload input field or click the upload input to select a photo from your device.'
                    }
                };

        // Convert message to lowercase for case-insensitive matching
        const lowercaseMessage = message.toLowerCase();

        // Check if the message matches any predefined keywords
        for (const category in predefinedResponses) {
            const matchFound = predefinedResponses[category].keywords.some(keyword => 
                lowercaseMessage.includes(keyword)
            );

            if (matchFound) {
                return res.status(200).json({
                    success: true,
                    message: predefinedResponses[category].response
                });
            }
        }

        // If no predefined response matches, proceed to the next middleware
        next();

    } catch (error) {
        return next({"status": 500, message: 'Error processing chat request',})
    }
};

export default chatBot;