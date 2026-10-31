![HackDay x Hacktoberfest 2026, NIT Jamshedpur](docs/banner.jpg)

# CodeArena

एक छोटा ऑनलाइन जज, जैसा कि मिनी लेटकोड, जिसे **NIT Jamshedpur में HackDay x Hacktoberfest 2026** के लिए बनाया गया है, जिसे Electrical Engineering Society द्वारा आयोजित किया जा रहा है।

## इवेंट

- **कब:** शनिवार, 31 अक्टूबर 2026, सुबह 9:30 बजे से दोपहर 3:30 बजे तक
- **कहाँ:** NIT Jamshedpur
- **टीम:** 3 सदस्य (हर टीम में कम से कम एक लड़की हो)
- **पुरस्कार:** शीर्ष प्रदर्शनकर्ताओं के लिए टी-शर्ट, Arduino बोर्ड और गिफ्ट, तथा हर प्रतिभागी के लिए लैपटॉप स्टिकर पैक

**भाग लेने के लिए दोनों जगह रजिस्टर करें:**

1. [NIT Jamshedpur रजिस्ट्रेशन फॉर्म](https://forms.gle/sGuPKwaUhMbXUrnbA)
2. [MLH पर Hacktoberfest Hack Day रजिस्ट्रेशन](https://events.mlh.com/events/14996-hacktoberfest-hack-day-jamshedpur-x-nit-jamshedpur)

कोई समस्या चुनें, उसका समाधान लिखें, **Submit** पर क्लिक करें, और परिणाम प्राप्त करें: Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error या Compilation Error.

यह काम करता है... अधिकांशतः। कुछ परिणाम गलत हैं, लीडरबोर्ड पेज खाली है, केवल Python समर्थित है, और डार्क मोड आधा बना हुआ है। **यही वह जगह है जहाँ आप मदद कर सकते हैं।** [Issues](../../issues) टैब देखें, कोई Issue चुनें, और pull request भेजें।

## यह कैसे काम करता है

आपका कोड कभी भी सर्वर पर नहीं चलता। यह **आपके खुद के ब्राउज़र के अंदर** चलता है:

- Python [Pyodide](https://pyodide.org/) के माध्यम से चलता है, जो WebAssembly के लिए कंपाइल किया गया Python है।
- कोड [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) में चलता है, इसलिए अनंत लूप पेज को फ्रीज नहीं कर सकता। जब टाइम लिमिट समाप्त होता है, पेज worker को खत्म कर देता है।
- पेज आपके आउटपुट की तुलना अपेक्षित आउटपुट से करता है और परिणाम निकालता है।
- छोटा Express सर्वर टीम अकाउंट्स और सबमिशन को संग्रहीत करता है, तथा समस्याएँ और लीडरबोर्ड को सेवा देता है।
- LeetCode की तरह, कोई भी समस्या पढ़ सकता है और कोड लिख सकता है, लेकिन **submit** करने के लिए आपको टीम अकाउंट की आवश्यकता होती है।

```
client/            React + Vite frontend
  public/python-worker.js   Web Worker में Python चलता है
  src/judge/                runner, output comparison, verdicts
  src/pages/                Problem list, problem page, leaderboard, log in / sign up
  src/auth.jsx              कौन लॉग इन है (React context)
server/            Express API (server/data/db.json में डेटा संग्रहीत करता है)
  auth.js                   sign up, log in, log out, sessions
problems/          हर problem के लिए अलग folder
```

## इसे लोकल मशीन पर चलाएँ

आपको [Node.js](https://nodejs.org/) 20 या नया चाहिए।

```bash
git clone https://github.com/<your-username>/HacktoberFest_EES.git
cd HacktoberFest_EES
npm install
npm run dev
```

http://localhost:5173 खोलें, **Sign up** पर क्लिक करें और टीम अकाउंट बनाएं, फिर **Hello, Arena!** समस्या हल करें

- फ्रंटएंड 5173 पोर्ट पर चलता है और API 4000 पोर्ट पर चलता है।
- पहली submission में कुछ सेकंड लगते हैं क्योंकि Python आपके ब्राउज़र में लोड हो रहा होता है।

## योगदान

शुरू करने से पहले [CONTRIBUTING.md](CONTRIBUTING.md) पढ़ें। इसमें tags और points, PRs का मूल्यांकन, किसी problem को जोड़ने की प्रक्रिया, और अच्छी PR कैसी दिखती है, इसकी जानकारी दी गई है। इवेंट के दौरान PRs को merge नहीं किया जाता; हर एक को अलग से जज किया जाता है।

## लाइसेंस

[MIT](LICENSE)
