export const chatBot = async (req, res, next) => {
  try {
    const { message } = req.body;

    // Define common user queries and their predefined responses
    const predefinedResponses = {
      login: {
        keywords: [
          "how to login",
          "cant login",
          "login problem",
          "sign in",
          "login",
        ],
        response:
          "To login, click the Login or Signup button in the navigation bar to access the form section.",
      },
      skinDetection: {
        keywords: [
          "skin detection",
          "detect skin",
          "analyze skin",
          "scan skin",
          "skin",
          "detection",
        ],
        response:
          "To use skin detection, go to the Skin Detection page from the navigation bar, upload a PNG, JPG, or WEBP image, and wait for the results.",
      },
      navigation: {
        keywords: [
          "how to find",
          "where is",
          "cant find",
          "navigate",
          "navigation",
        ],
        response:
          "Use the navigation bar to explore and access all features that Cutis provides.",
      },
      upload: {
        keywords: ["upload", "photo", "drag", "upload photo", "image"],
        response:
          "You can upload images easily by using PNG, JPG, or WEBP files.",
      },
    };

    // Convert message to lowercase for case-insensitive matching
    const lowercaseMessage = message.toLowerCase();

    // Check if the message matches any predefined keywords
    for (const category in predefinedResponses) {
      const matchFound = predefinedResponses[category].keywords.some(
        (keyword) => lowercaseMessage.includes(keyword)
      );

      if (matchFound) {
        return res.status(200).json({
          success: true,
          message: predefinedResponses[category].response,
        });
      }
    }

    // If no predefined response matches, proceed to the next middleware
    next();
  } catch (error) {
    return next({ status: 500, message: "Error processing chat request" });
  }
};

export default chatBot;
