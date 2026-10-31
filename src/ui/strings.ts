import type { FadeLevel, TaskId } from '@/types/contracts'

/** A UI string in both supported languages. */
export interface Pair {
  ur: string
  en: string
}

export const S = {
  back: { ur: 'واپس', en: 'Back' },
  goHome: { ur: 'گھر جائیں', en: 'Go home' },
  listen: { ur: 'سنیں', en: 'Listen' },
  mainMenu: { ur: 'مرکزی مینو', en: 'Main menu' },
  navHome: { ur: 'گھر', en: 'Home' },
  navVideos: { ur: 'میری ویڈیوز', en: 'My videos' },
  navProgress: { ur: 'میری ترقی', en: 'My progress' },
  navSettings: { ur: 'ترتیبات', en: 'Settings' },
  comingSoon: { ur: 'جلد آ رہا ہے', en: 'Coming soon' },
  comingSoonBody: { ur: 'یہ حصہ ابھی تیار ہو رہا ہے۔', en: 'This part is still being prepared.' },

  // Welcome
  appName: { ur: 'اشارہ', en: 'Ishaara' },
  tagline: {
    ur: 'آپ کی اپنی اسکرین پر، آپ کی زبان میں، فون سیکھیں',
    en: 'Learn your phone on your own screen, in your language',
  },
  privacyTitle: { ur: 'آپ کی رازداری', en: 'Your privacy' },
  privacyItems: [
    { ur: 'آپ کی تصویریں اس فون پر ہی رہتی ہیں۔', en: 'Your screenshots stay on this phone.' },
    { ur: 'کوئی بھی چیز کہیں نہیں بھیجی جاتی۔', en: 'Nothing is sent anywhere.' },
    {
      ur: 'جب چاہیں، کوئی بھی چیز مٹا سکتے ہیں۔',
      en: 'You can delete anything, whenever you like.',
    },
  ] satisfies Pair[],
  start: { ur: 'شروع کریں', en: 'Start' },

  // Home
  greeting: { ur: 'السلام علیکم', en: 'Assalamu alaikum' },
  homeQuestion: { ur: 'آپ کو کیا کرنا ہے؟', en: 'What would you like to do?' },
  micIdle: { ur: 'ٹیپ کریں اور بتائیں', en: 'Tap and tell me' },
  micListening: { ur: 'سن رہی ہوں…', en: 'Listening…' },
  showScreen: { ur: 'میری اسکرین دکھائیں', en: 'Show my screen' },
  notUnderstood: { ur: 'کوئی بات نہیں، دوبارہ کوشش کریں', en: 'No problem, please try again' },
  tasks: {
    photo: { ur: 'تصویر بھیجنا', en: 'Send a photo' },
    video_call: { ur: 'ویڈیو کال', en: 'Video call' },
    voice_note: { ur: 'آواز کا پیغام', en: 'Voice note' },
    send_money: { ur: 'پیسے بھیجنا', en: 'Send money' },
  } satisfies Record<TaskId, Pair>,

  // Settings
  settingsTitle: { ur: 'ترتیبات', en: 'Settings' },
  textSize: { ur: 'تحریر کا سائز', en: 'Text size' },
  textNormal: { ur: 'عام', en: 'Normal' },
  textLarge: { ur: 'بڑا', en: 'Large' },
  textXl: { ur: 'بہت بڑا', en: 'Extra large' },
  contrast: { ur: 'گہرا رنگ', en: 'High contrast' },
  contrastHint: { ur: 'متن اور بٹن زیادہ واضح ہوں گے', en: 'Text and buttons will be clearer' },
  simpleMode: { ur: 'سادہ انداز', en: 'Simple mode' },
  simpleHint: { ur: 'کم حرکت اور بغیر تھری ڈی', en: 'Less motion and no 3D' },
  language: { ur: 'زبان', en: 'Language' },
  langUr: { ur: 'اردو', en: 'Urdu' },
  langEn: { ur: 'English', en: 'English' },
  setup: { ur: 'فون تیار کریں', en: 'Set up the phone' },
  deleteAll: { ur: 'سب کچھ مٹائیں', en: 'Delete everything' },
  deleteTitle: { ur: 'کیا سب کچھ مٹانا ہے؟', en: 'Delete everything?' },
  deleteBody: {
    ur: 'تمام سبق اور تصویریں اس فون سے مٹ جائیں گی۔ یہ واپس نہیں آئیں گی۔',
    en: 'All lessons and screenshots will be removed from this phone. This cannot be undone.',
  },
  keepIt: { ur: 'رہنے دیں', en: 'Keep them' },
  confirmDelete: { ur: 'ہاں، مٹا دیں', en: 'Yes, delete' },
  deleted: { ur: 'سب کچھ مٹا دیا گیا', en: 'Everything was deleted' },

  // Library
  libraryTitle: { ur: 'میری ویڈیوز', en: 'My videos' },
  libraryEmpty: { ur: 'ابھی کوئی سبق محفوظ نہیں ہے', en: 'No lessons saved yet' },
  libraryEmptyBody: {
    ur: 'جب کوئی سبق بنے گا تو وہ یہاں نظر آئے گا۔',
    en: 'Lessons you make will appear here.',
  },

  // Progress
  progressTitle: { ur: 'میری ترقی', en: 'My progress' },
  learnedCount: (n: number): Pair => ({
    ur: `آپ نے ${n} چیزیں خود سیکھ لیں`,
    en: `You learned ${n} ${n === 1 ? 'thing' : 'things'} on your own`,
  }),
  levels: {
    1: { ur: 'ویڈیو دیکھی', en: 'Watched a video' },
    2: { ur: 'اشارہ کافی تھا', en: 'A hint was enough' },
    3: { ur: 'خود کر لیا!', en: 'Did it myself!' },
  } satisfies Record<FadeLevel, Pair>,
  progressEmpty: { ur: 'ابھی کوئی سبق شروع نہیں ہوا', en: 'No lessons started yet' },
  progressEmptyBody: {
    ur: 'پہلا سبق لینے کے لیے گھر جائیں۔',
    en: 'Go home to start your first lesson.',
  },

  // Steps
  stepOf: (n: number, total: number): Pair => ({
    ur: `قدم ${n} / ${total}`,
    en: `Step ${n} of ${total}`,
  }),
  next: { ur: 'اگلا', en: 'Next' },
  prev: { ur: 'پچھلا', en: 'Previous' },
  yourScreen: { ur: 'آپ کی اسکرین', en: 'Your screen' },

  // Image input (Ask and Check)
  dikhayein: { ur: 'دکھائیں', en: 'Show my screen' },
  tripleTapFirst: {
    ur: 'پہلے فون کی پشت پر تین بار ٹیپ کریں',
    en: 'First, tap the back of the phone three times',
  },
  pickFromPhotos: { ur: 'تصویروں سے چنیں', en: 'Choose from photos' },
  trySample: { ur: 'نمونہ آزمائیں', en: 'Try a sample' },
  dropHere: { ur: 'اسکرین کی تصویر یہاں گھسیٹیں', en: 'Drag a screenshot here' },
  pickPicture: { ur: 'براہ کرم تصویر چنیں', en: 'Please choose a picture' },
  sampleUnavailable: { ur: 'یہ نمونہ ابھی دستیاب نہیں ہے', en: 'This sample is not available yet' },
  shareAgain: { ur: 'اسکرین شاٹ دوبارہ شیئر کریں', en: 'Share the screenshot again' },

  // Ask
  redactTitle: { ur: 'کیا کچھ چھپانا ہے؟', en: 'Hide anything private?' },
  redactHelp: {
    ur: 'اگر اسکرین پر بیلنس یا نمبر ہے تو اس پر انگلی پھیر کر چھپا دیں',
    en: 'If the screen shows a balance or a number, drag your finger over it to hide it.',
  },
  redactDraw: { ur: 'چھپائیں', en: 'Hide' },
  redactUndo: { ur: 'واپس لیں', en: 'Undo' },
  chooseAnother: { ur: 'دوسری تصویر چنیں', en: 'Choose another' },
  continueBtn: { ur: 'آگے', en: 'Continue' },
  making: { ur: 'آپ کی ویڈیو بن رہی ہے…', en: 'Making your video…' },
  firstRunPrep: { ur: 'پہلی بار تیاری ہو رہی ہے…', en: 'Getting ready for the first time…' },
  safetyBody: {
    ur: 'یہ اسکرین کسی کو نہ دکھائیں اور نہ بھیجیں — اس پر خفیہ کوڈ ہے',
    en: 'Do not show or send this screen to anyone. It has a secret code on it.',
  },
  familyBody: { ur: 'یہ اسکرین ابھی میں سیکھ رہی ہوں', en: 'I am still learning this screen' },
  askFamily: { ur: 'گھر والوں سے پوچھیں', en: 'Ask family' },
  retry: { ur: 'دوبارہ کوشش کریں', en: 'Try again' },
  shareUnsupported: { ur: 'اس فون پر شیئر کرنے کی سہولت نہیں ہے', en: 'Sharing is not available on this phone' },

  // Lesson
  lessonMissing: { ur: 'یہ سبق نہیں ملا', en: 'This lesson was not found' },
  play: { ur: 'چلائیں', en: 'Play' },
  pause: { ur: 'روکیں', en: 'Pause' },
  replay: { ur: 'دوبارہ دیکھیں', en: 'Watch again' },
  slow: { ur: 'آہستہ', en: 'Slow' },
  doItMyself: { ur: 'اب آپ خود کریں', en: 'Now you do it' },
  knowIt: { ur: 'آپ کو آتا ہے، خود کریں', en: 'You know this. Do it yourself.' },
  needHint: { ur: 'اشارہ چاہیے؟', en: 'Need a hint?' },

  // Check
  checkInstructions: {
    ur: 'اب اصل ایپ میں یہ کریں، پھر نئی اسکرین دکھائیں',
    en: 'Now do this in the real app, then show the new screen.',
  },
  checking: { ur: 'آپ کا قدم دیکھ رہی ہوں…', en: 'Looking at your step…' },
  wellDone: { ur: 'شاباش! بالکل صحیح', en: 'Well done! Exactly right.' },
  nextStepBtn: { ur: 'اگلا قدم', en: 'Next step' },
  hintCoral: { ur: 'کوئی بات نہیں — یہ والا بٹن دبائیں', en: 'No problem. Press this button.' },
  notClear: { ur: 'یہ اسکرین مجھے صاف نظر نہیں آئی', en: 'I could not see this screen clearly.' },
  shabash: { ur: 'شاباش! آپ نے خود کر لیا', en: 'Well done! You did it yourself.' },
  seeProgress: { ur: 'میری ترقی دیکھیں', en: 'See my progress' },

  // Home voice query
  understanding: { ur: 'سمجھ رہی ہوں…', en: 'Understanding…' },
  youSaid: (text: string): Pair => ({ ur: `آپ نے کہا: ${text}`, en: `You said: ${text}` }),
  yesDoTask: (task: Pair): Pair => ({ ur: `ہاں، ${task.ur}`, en: `Yes, ${task.en}` }),
  sayAgain: { ur: 'دوبارہ بولیں', en: 'Say it again' },
  notHeard: {
    ur: 'معاف کیجیے، سمجھ نہیں آیا — نیچے سے چنیں',
    en: 'Sorry, I did not catch that. Choose below.',
  },
  micDenied: {
    ur: 'مائیک کی اجازت نہیں ملی۔ ایڈریس بار میں تالے کے نشان کو دبائیں، مائیک کو اجازت دیں، پھر دوبارہ ٹیپ کریں۔ نیچے سے بھی چن سکتے ہیں۔',
    en: 'Microphone access was not allowed. Tap the lock icon in the address bar, allow the microphone, then tap again. You can also choose below.',
  },
  speechPrep: {
    ur: 'آواز سمجھنے کا نظام تیار ہو رہا ہے — صرف پہلی بار',
    en: 'Preparing speech understanding — first time only',
  },

  // Settings: on-device models
  modelsTitle: { ur: 'آف لائن ماڈلز', en: 'On-device models' },

  // Setup guide
  setupTry: {
    ur: 'اب آزمائیں: فون کی پشت پر تین بار ٹیپ کریں',
    en: 'Now try it: tap the back of the phone three times.',
  },
  shortcutTitle: { ur: 'شارٹ کٹ', en: 'The Shortcut' },
  shortcutBody: {
    ur: 'یہ شارٹ کٹ اسکرین کی تصویر لے کر اشارہ کو کھولتا ہے۔',
    en: 'This Shortcut takes a screenshot and opens Ishaara with it.',
  },
  shortcutSteps: [
    { ur: 'اسکرین شاٹ لیں', en: 'Take Screenshot' },
    { ur: 'کلپ بورڈ پر کاپی کریں', en: 'Copy to Clipboard' },
    { ur: 'یہ پتا کھولیں', en: 'Open URL' },
  ] satisfies Pair[],
  shortcutManual: { ur: 'خود بنانے کے قدم', en: 'Steps to build it yourself' },
  shortcutManualSteps: [
    { ur: 'شارٹ کٹ ایپ کھولیں', en: 'Open the Shortcuts app.' },
    { ur: '+ کا نشان دبائیں', en: 'Tap the + sign.' },
    { ur: 'Take Screenshot شامل کریں، پھر Copy to Clipboard', en: 'Add Take Screenshot, then Copy to Clipboard.' },
    { ur: 'Open URL شامل کریں اور یہ پتا لکھیں', en: 'Add Open URL and type this address:' },
    { ur: 'اس شارٹ کٹ کا نام Ishaara رکھیں', en: 'Name the Shortcut Ishaara.' },
  ] satisfies Pair[],
  addShortcut: { ur: 'شارٹ کٹ شامل کریں', en: 'Add the Shortcut' },
  shortcutNotAdded: { ur: 'شارٹ کٹ لنک ابھی شامل نہیں', en: 'Shortcut link not added yet' },
  shortcutNotAddedNote: {
    ur: 'اسے ایک بار بنانے کے لیے نیچے دیے گئے قدم استعمال کریں',
    en: 'Use the steps below to build it once',
  },
  setupSteps: [
    {
      title: { ur: 'ترتیبات کھولیں', en: 'Open Settings' },
      caption: {
        ur: 'ہوم اسکرین پر سرمئی گیئر والی "Settings" ایپ کو دبائیں۔',
        en: 'On the home screen, tap the grey gear app called Settings.',
      },
    },
    {
      title: { ur: 'ایکسیسبیلیٹی کھولیں', en: 'Open Accessibility' },
      caption: {
        ur: 'ترتیبات میں نیچے جا کر "Accessibility" کو دبائیں۔',
        en: 'In Settings, scroll down and tap Accessibility.',
      },
    },
    {
      title: { ur: 'ٹچ کھولیں', en: 'Open Touch' },
      caption: { ur: '"Physical and Motor" میں "Touch" کو دبائیں۔', en: 'Under Physical and Motor, tap Touch.' },
    },
    {
      title: { ur: 'بیک ٹیپ کھولیں', en: 'Open Back Tap' },
      caption: { ur: '"Back Tap" کو دبائیں۔', en: 'Tap Back Tap.' },
    },
    {
      title: { ur: 'ٹرپل ٹیپ کھولیں', en: 'Open Triple Tap' },
      caption: { ur: '"Triple Tap" کی لائن کو دبائیں۔', en: 'Tap the Triple Tap row.' },
    },
    {
      title: { ur: 'Ishaara شارٹ کٹ چنیں', en: 'Choose the Ishaara Shortcut' },
      caption: {
        ur: 'فہرست میں "Ishaara" کو دبائیں، پھر واپس جائیں۔',
        en: 'In the list, tap Ishaara, then go back.',
      },
    },
  ] satisfies { title: Pair; caption: Pair }[],
  androidTitle: { ur: 'اینڈرائیڈ فون', en: 'Android phone' },
  headingIphone: { ur: 'آئی فون', en: 'iPhone' },
  headingAndroid: { ur: 'اینڈرائیڈ', en: 'Android' },
  installApp: { ur: 'اشارہ انسٹال کریں', en: 'Install Ishaara' },
  androidBody: {
    ur: 'اینڈرائیڈ پر: Chrome مینو سے "ایپ انسٹال کریں" چن کر اشارہ کو ہوم اسکرین پر شامل کریں۔ پھر گیلری میں اسکرین شاٹ کھولیں، شیئر دبائیں اور اشارہ چنیں۔',
    en: 'On Android: add Ishaara to the Home Screen (Chrome menu → Install app), then in Gallery open a screenshot → Share → Ishaara.',
  },
}
