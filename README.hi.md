![HackDay x Hacktoberfest 2026, NIT Jamshedpur](docs/banner.jpg)

# CodeArena

[Read this in English](README.md)

CodeArena एक छोटा ऑनलाइन जज है, एक मini LeetCode जैसा, जो **HackDay x Hacktoberfest 2026 at NIT Jamshedpur** के लिए बनाया गया है, जिसे Electrical Engineering Society द्वारा आयोजित किया जाता है।

## इवेंट के बारे में

- **कब:** शनिवार, 31 अक्टूबर 2026, सुबह 9:30 से दोपहर 3:30 तक
- **कहाँ:** NIT जमशेखड़ीपुर
- **टीमें:** 3 सदस्य (प्रत्येक टीम में कम से कम एक महिला सदस्य)
- **पुरस्कार:** शीर्ष प्रदर्शन के लिए T-शर्ट, Arduino बोर्ड और स्वाग, और हर भाग लेने वाले को एक लैपटॉप स्टीकर पैक

**भाग लेने के लिए दोनों जगहों पर पंजीकरण करें:**

1. [NIT जमशेखड़ीपुर रजिस्ट्रेशन फॉर्म](https://forms.gle/sGuPKwaUhMbXUrnbA)
2. [MLH पर Hacktoberfest Hack Day रजिस्ट्रेशन](https://events.mlh.com/events/14996-hacktoberfest-hack-day-jamshedpur-x-nit-jamshedpur)

एक समस्या चुनें, एक समाधान लिखें, **Submit** दबाएं, और परिणाम पाएं: Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error या Compilation Error।

यह अधिकांशतः काम करता है। कुछ verdicts गलत होते हैं, लीडरबोर्ड पृष्ठ खाली है, केवल Python समर्थित है, और डार्क मोड आधा पूरा है। **उसकी जरूरत यहीं है।** [Issues](../../issues) टैब देखें, एक चुनें, और एक pull request भेजें।

## यह कैसे काम करता है

आपका कोड कभी सर्वर पर नहीं चलता। वह **आपके ब्राउज़र के अंदर** चलता है:

- Python [Pyodide](https://pyodide.org/) के ज़रिए चलता है, जो Python को WebAssembly में कंपाइल करता है।
- कोड एक [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) में चलता है, इसलिए अनंत लूप से पृष्ठ फ्रीज नहीं होता। जब टाइम लिमिट ख़त्म हो जाती है, तो पृष्ठ वर्कर को मार देता है।
- पृष्ठ आपके आउटपुट की तुलना अपेक्षित आउटपुट से करता है और verdict निकालता है।
- छोटा Express सर्वर टीम अकाउंट और सब्मिशन को स्टोर करता है, और समस्याएं और लीडरबोर्ड सर्व करता है।
- LeetCode जैसा, कोई भी समस्याएँ पढ़ सकता है और कोड लिख सकता है, लेकिन आपको **submit** करने के लिए एक टीम अकाउंट चाहिए।

```
client/            React + Vite फ्रंटएंड
  public/python-worker.js   पायथन को Web Worker में चलाता है
  src/judge/                रनर, आउटपुट तुलना, verdicts
  src/pages/                समस्या सूची, समस्या पृष्ठ, लीडरबोर्ड, लॉग इन / साइन अप
  src/auth.jsx              कौन लॉग इन है (React context)
server/            Express API (डेटा को server/data/db.json में स्टोर करता है)
  auth.js                   साइन अप, लॉग इन, लॉग आउट, सत्र
problems/          प्रति समस्या एक फ़ोल्डर
```

## स्थानीय रूप से चलाएँ

आपको [Node.js](https://nodejs.org/) 20 या नया संस्करण चाहिए।

```bash
git clone https://github.com/<your-username>/HacktoberFest_EES.git
cd HacktoberFest_EES
npm install
npm run dev
```

http://localhost:5173 खोलें, **Sign up** क्लिक करके एक टीम अकाउंट बनाएं, और **Hello, Arena!** सॉल्यूशन करें।

- फ्रंटएंड पोर्ट 5173 पर चलता है और API पोर्ट 4000 पर।
- पहला सब्मिशन कुछ सेकंड लेता है जब तक ब्राउज़र में पायथन लोड होता है।

## योगदान देना

शुरू करने से पहले [CONTRIBUTING.md](CONTRIBUTING.md) पढ़ें। इसमें टैग और अंक, PRs कैसे मूल्‍यांकित किए जाते हैं, कैसे एक समस्या जोड़ें और एक अच्छा PR क्या लगता है, यह बताया गया है। ईवेंट के दौरान PRs मर्ज नहीं किए जाते; प्रत्येक का स्वतंत्र रूप से मूल्यांकन किया जाता है।

## लाइसेंस

[MIT](LICENSE)
