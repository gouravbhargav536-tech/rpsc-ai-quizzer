const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai"); // Google AI Studio Official SDK

admin.initializeApp();

// secrets: ["GEMINI_API_KEY"] का मतलब है आपकी बिल्डर की सुरक्षित है
exports.getOrCreateQuiz = onCall({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
  
  // 1. चेक करें कि यूजर लॉग-इन है या नहीं
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "कृपया ऐप में पहले लॉगिन करें।");
  }

  const uid = request.auth.uid;
  const { subject, topic } = request.data;
  
  const userRef = admin.firestore().collection("users").doc(uid);
  const userDoc = await userRef.get();
  
  // अगर यूजर का डॉक्यूमेंट नहीं बना है, तो नया बनायें
  let userData = userDoc.exists ? userDoc.data() : { quizCount: 0 };
  const currentCount = userData.quizCount || 0;

  // 2. चेक करें कि क्या यूजर की लिमिट 60 से कम है
  if (currentCount < 60) {
    
    // बिल्डर (आपकी) API Key का उपयोग करके Gemini AI को इनिशियलाइज करें
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      // AI से प्रॉम्प्ट देकर JSON फॉर्मेट में क्विज़ मांगें
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // लेटेस्ट स्टेबल मॉडल
        contents: `Create a 5-question multiple choice quiz about ${subject} (${topic}) in JSON format. 
                   Format: { "questions": [ { "question": "", "options": ["", "", "", ""], "answer": "" } ] }`,
        config: { responseMimeType: "application/json" } // सीधे JSON रिस्पॉन्स के लिए
      });

      const quizData = JSON.parse(response.text);

      // नए क्विज़ को फायरबेस के ग्लोबल पूल में सेव करें ताकि बाद में इस्तेमाल हो सके
      const quizRef = admin.firestore().collection("quizzes").doc();
      await quizRef.set({
        ...quizData,
        subject: subject.toLowerCase(),
        topic: topic.toLowerCase(),
        generatedBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // यूजर का काउंटर 1 बढ़ा दें
      await userRef.set({ quizCount: admin.firestore.FieldValue.increment(1) }, { merge: true });

      return { source: "api_generated", quiz: quizData };

    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new HttpsError("internal", "क्विज़ जनरेट करने में समस्या आई।");
    }

  } else {
    // 3. बैकअप प्लान: जब यूजर 60 क्विज़ पूरे कर चुका हो
    // डेटाबेस से उसी सब्जेक्ट का कोई भी पुराना क्विज़ निकालें
    const quizSnapshot = await admin.firestore().collection("quizzes")
      .where("subject", "==", subject.toLowerCase())
      .limit(5) // कुछ विकल्प लें ताकि रैंडम दे सकें
      .get();

    if (quizSnapshot.empty) {
      throw new HttpsError("not-found", "इस विषय पर अभी कोई पुराना क्विज़ मौजूद नहीं है।");
    }

    // मिले हुए क्विज़ में से कोई एक रैंडमली चुनकर यूजर को दें
    const randomIndex = Math.floor(Math.random() * quizSnapshot.docs.length);
    const backupQuiz = quizSnapshot.docs[randomIndex].data();
    
    return { source: "firebase_storage", quiz: backupQuiz };
  }
});
