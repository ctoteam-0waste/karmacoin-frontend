import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { X, Trophy, AlertCircle, Timer } from 'lucide-react-native';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { LinearGradient } from 'expo-linear-gradient';
import { profileService } from '../services/profile';

const { width } = Dimensions.get('window');
const TIMER_DURATION = 15;

// ── Age group resolver ──────────────────────────────────────────────────────
type AgeGroup = 'kids' | 'teens' | 'young_adults' | 'adults' | 'seniors';

function getAgeGroup(age: number): AgeGroup {
  if (age <= 12) return 'kids';
  if (age <= 17) return 'teens';
  if (age <= 30) return 'young_adults';
  if (age <= 50) return 'adults';
  return 'seniors';
}

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  kids:         '🌱 Kids Edition',
  teens:        '⚡ Teen Edition',
  young_adults: '🌍 Explorer Edition',
  adults:       '♻️ Pro Edition',
  seniors:      '🏆 Wisdom Edition',
};

const AGE_GROUP_COINS: Record<AgeGroup, number> = {
  kids: 5,
  teens: 8,
  young_adults: 10,
  adults: 12,
  seniors: 10,
};

// ── Question bank per age group ─────────────────────────────────────────────
const QUESTION_BANK: Record<AgeGroup, { question: string; options: string[]; correctIndex: number }[]> = {
  kids: [
    {
      question: "Which bin should you put an empty water bottle in?",
      options: ["Green bin", "Blue bin", "Red bin", "Dustbin"],
      correctIndex: 1,
    },
    {
      question: "What color is usually a recycling bin?",
      options: ["Red", "Black", "Blue", "Yellow"],
      correctIndex: 2,
    },
    {
      question: "Which of these can be recycled?",
      options: ["Food scraps", "Newspaper", "Broken glass", "Rubber bands"],
      correctIndex: 1,
    },
    {
      question: "What happens to recycled paper?",
      options: ["It is burned", "It is turned into new paper", "It is buried", "It disappears"],
      correctIndex: 1,
    },
    {
      question: "How can you help reduce waste at home?",
      options: ["Throw everything away", "Use a reusable water bottle", "Buy more plastic bags", "Leave lights on"],
      correctIndex: 1,
    },
    {
      question: "Which item below is NOT recyclable?",
      options: ["Aluminium can", "Glass bottle", "Pizza box with food", "Cardboard"],
      correctIndex: 2,
    },
    {
      question: "What does the 3 arrow recycling symbol mean?",
      options: ["Throw away", "Reduce, Reuse, Recycle", "Dangerous waste", "Food safe"],
      correctIndex: 1,
    },
  ],

  teens: [
    {
      question: "How long does it take for a plastic bottle to decompose?",
      options: ["10 years", "50 years", "450 years", "Never"],
      correctIndex: 2,
    },
    {
      question: "Which gas is most responsible for global warming?",
      options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
      correctIndex: 1,
    },
    {
      question: "What is e-waste?",
      options: ["Energy waste", "Electronic waste", "Environmental waste", "Eating waste"],
      correctIndex: 1,
    },
    {
      question: "Which of these is a renewable energy source?",
      options: ["Coal", "Natural gas", "Solar power", "Diesel"],
      correctIndex: 2,
    },
    {
      question: "What percentage of ocean plastic comes from rivers?",
      options: ["10%", "30%", "80%", "50%"],
      correctIndex: 2,
    },
    {
      question: "Which bin is used for dry waste like cardboard?",
      options: ["Green bin", "Blue bin", "Red bin", "Yellow bin"],
      correctIndex: 1,
    },
    {
      question: "What is composting?",
      options: ["Burning waste", "Burying plastic", "Turning organic waste into fertilizer", "Melting metals"],
      correctIndex: 2,
    },
  ],

  young_adults: [
    {
      question: "What is the most recycled material globally?",
      options: ["Plastic", "Aluminium", "Glass", "Paper"],
      correctIndex: 1,
    },
    {
      question: "What does 'carbon footprint' mean?",
      options: ["A footprint made of carbon", "Total greenhouse gas emissions caused by a person", "A type of fuel", "Carbon tax"],
      correctIndex: 1,
    },
    {
      question: "Which country produces the most e-waste per person?",
      options: ["China", "USA", "Norway", "India"],
      correctIndex: 2,
    },
    {
      question: "What is upcycling?",
      options: ["Throwing things higher", "Turning waste into something of higher value", "Recycling paper only", "Burning waste for energy"],
      correctIndex: 1,
    },
    {
      question: "Which packaging material has the lowest carbon footprint?",
      options: ["Plastic wrap", "Glass bottle", "Aluminium can", "Paper bag"],
      correctIndex: 3,
    },
    {
      question: "How much CO₂ does recycling 1 ton of aluminium save compared to new production?",
      options: ["5 kg", "100 kg", "9,000 kg", "500 kg"],
      correctIndex: 2,
    },
    {
      question: "What is a circular economy?",
      options: ["Economy that goes in circles", "System where products are reused and recycled continuously", "Round-shaped market", "Banking system"],
      correctIndex: 1,
    },
  ],

  adults: [
    {
      question: "What percentage of plastic produced globally has been recycled?",
      options: ["50%", "30%", "9%", "20%"],
      correctIndex: 2,
    },
    {
      question: "Which sector contributes most to global carbon emissions?",
      options: ["Transportation", "Agriculture", "Energy production", "Manufacturing"],
      correctIndex: 2,
    },
    {
      question: "What is Extended Producer Responsibility (EPR)?",
      options: ["A tax on producers", "Policy making producers responsible for end-of-life product disposal", "Extended warranty", "Export regulation"],
      correctIndex: 1,
    },
    {
      question: "How many years does it take for a glass bottle to decompose in a landfill?",
      options: ["100 years", "500 years", "1 million years", "5,000 years"],
      correctIndex: 2,
    },
    {
      question: "What does BIS certification on electronics mean for e-waste?",
      options: ["Product is cheap", "Product meets safety and recyclability standards", "Product is foreign", "Product is waterproof"],
      correctIndex: 1,
    },
    {
      question: "India generates approximately how much e-waste per year?",
      options: ["500 tonnes", "50,000 tonnes", "3.2 million tonnes", "100 million tonnes"],
      correctIndex: 2,
    },
    {
      question: "What is the Swachh Bharat Mission's role in waste management?",
      options: ["Only for rural areas", "Promotes ODF, waste segregation and cleanliness nationally", "Just a slogan", "Manages only hospitals"],
      correctIndex: 1,
    },
  ],

  seniors: [
    {
      question: "Which traditional Indian practice is similar to modern composting?",
      options: ["Using cow dung as fertilizer", "Burning wood", "Using plastic bags", "Storing food in tins"],
      correctIndex: 0,
    },
    {
      question: "What is the simplest way to reduce household waste?",
      options: ["Buy more products", "Avoid single-use plastics", "Use more electricity", "Throw everything together"],
      correctIndex: 1,
    },
    {
      question: "Which of these items should never go in regular dustbin?",
      options: ["Newspaper", "Old medicines and batteries", "Fruit peels", "Cardboard"],
      correctIndex: 1,
    },
    {
      question: "What does 'Reduce, Reuse, Recycle' mean in daily life?",
      options: ["Buy less, fix and reuse old items, separate waste", "Buy more, throw away, burn", "Only buy recycled items", "None of these"],
      correctIndex: 0,
    },
    {
      question: "How should you dispose of old mobile phones?",
      options: ["Throw in dustbin", "Burn it", "Give to authorised e-waste collector", "Bury in soil"],
      correctIndex: 2,
    },
    {
      question: "Which waste decomposes fastest in a garden?",
      options: ["Plastic bag", "Glass", "Vegetable peels", "Aluminium foil"],
      correctIndex: 2,
    },
    {
      question: "What is the benefit of segregating wet and dry waste at home?",
      options: ["No benefit", "Makes recycling easier and reduces landfill", "Only helps garbage collectors", "Saves water"],
      correctIndex: 1,
    },
  ],
};

// Pick 5 random questions from the group
function pickQuestions(group: AgeGroup) {
  const all = [...QUESTION_BANK[group]];
  const picked = [];
  while (picked.length < 5 && all.length > 0) {
    const idx = Math.floor(Math.random() * all.length);
    picked.push(all.splice(idx, 1)[0]);
  }
  return picked;
}

// ── Component ───────────────────────────────────────────────────────────────
export function QuizScreen({ navigation }: any) {
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [questions, setQuestions] = useState<typeof QUESTION_BANK['kids']>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Fetch age from profile
  useEffect(() => {
    profileService.getProfile()
      .then(data => {
        const age = data?.age || data?.demographics?.age || 25;
        const group = getAgeGroup(Number(age));
        setAgeGroup(group);
        setQuestions(pickQuestions(group));
      })
      .catch(() => {
        // Default to young_adults if profile fetch fails
        setAgeGroup('young_adults');
        setQuestions(pickQuestions('young_adults'));
      })
      .finally(() => setIsLoadingProfile(false));
  }, []);

  // Timer
  useEffect(() => {
    if (isLoadingProfile || isFinished || selectedOption !== null || questions.length === 0) return;
    if (timeLeft === 0) {
      setSelectedOption(-1);
      setTimeout(goToNextQuestion, 1500);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isFinished, selectedOption, isLoadingProfile, questions]);

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (index === questions[currentQ].correctIndex) setScore(prev => prev + 1);
    setTimeout(goToNextQuestion, 1500);
  };

  const goToNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(TIMER_DURATION);
    } else {
      setIsFinished(true);
    }
  };

  // Loading state
  if (isLoadingProfile) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="white" />
          <Text style={{ color: 'white', marginTop: 16, fontWeight: '700', fontSize: 16 }}>Preparing your quiz...</Text>
        </SafeAreaView>
      </View>
    );
  }

  // Results screen
  if (isFinished && ageGroup) {
    const coinsPerCorrect = AGE_GROUP_COINS[ageGroup];
    const creditsEarned = score * coinsPerCorrect;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <LinearGradient colors={['#064e3b', '#15803d']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.resultsArea}>
          <View style={styles.trophyContainer}>
            <Trophy size={100} color="#fcd34d" />
            <Text style={styles.resultsTitle}>Quiz Completed!</Text>
            <Text style={styles.editionLabel}>{AGE_GROUP_LABELS[ageGroup]}</Text>
            <Text style={styles.resultsSub}>You answered {score} out of {questions.length} correctly.</Text>
          </View>

          <View style={styles.creditsCard}>
            <Text style={styles.creditsLabel}>You Earned</Text>
            <View style={styles.creditsValueRow}>
              <KarmaCoin size={32} glow />
              <Text style={styles.creditsValue}>+{creditsEarned}</Text>
            </View>
            <Text style={styles.creditsNote}>{coinsPerCorrect} credits per correct answer • Added to your Karma Wallet</Text>
          </View>

          <TouchableOpacity style={styles.claimBtn} onPress={() => navigation.navigate('App')}>
            <Text style={styles.claimBtnText}>Claim & Return Home</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (questions.length === 0 || !ageGroup) return null;

  const question = questions[currentQ];
  const progressPercent = (currentQ / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#064e3b', '#166534']} style={styles.topBackground} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={24} color="white" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Daily Eco-Quiz</Text>
          <Text style={styles.editionBadge}>{AGE_GROUP_LABELS[ageGroup]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBarFilled, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.questionCounter}>Question {currentQ + 1} of {questions.length}</Text>

      {/* Timer */}
      <View style={styles.timerRow}>
        <Timer size={20} color={timeLeft <= 4 ? '#ef4444' : '#fcd34d'} />
        <Text style={[styles.timerText, timeLeft <= 4 && styles.timerTextDanger]}>
          00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </Text>
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = selectedOption !== null && index === question.correctIndex;
            const isWrong = isSelected && index !== question.correctIndex;

            let stateStyle = {};
            let textStyle = {};
            if (isCorrect) { stateStyle = styles.optionCorrect; textStyle = styles.optionTextWhite; }
            else if (isWrong) { stateStyle = styles.optionWrong; textStyle = styles.optionTextWhite; }
            else if (selectedOption !== null && index === question.correctIndex) { stateStyle = styles.optionCorrectGlow; }

            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionBtn, stateStyle]}
                onPress={() => handleSelectOption(index)}
                disabled={selectedOption !== null}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, textStyle]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedOption === -1 && (
          <View style={styles.timeoutBanner}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.timeoutText}>Time's up!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  editionBadge: { color: '#fcd34d', fontSize: 11, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },

  progressContainer: { marginHorizontal: 20, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  progressBarFilled: { height: '100%', backgroundColor: '#fcd34d', borderRadius: 3 },
  questionCounter: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: '600', fontSize: 12 },

  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  timerText: { fontSize: 36, fontWeight: '800', color: 'white' },
  timerTextDanger: { color: '#ef4444' },

  questionCard: { marginHorizontal: 20, backgroundColor: 'white', borderRadius: 24, padding: 24, marginTop: 24, elevation: 6, shadowColor: '#000', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.1, shadowRadius: 12 },
  questionText: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 28, lineHeight: 30 },

  optionsContainer: { gap: 14 },
  optionBtn: { padding: 18, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center' },
  optionText: { fontSize: 15, fontWeight: '700', color: '#334155' },
  optionCorrect: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  optionCorrectGlow: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  optionWrong: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  optionTextWhite: { color: 'white' },

  timeoutBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 8 },
  timeoutText: { color: '#ef4444', fontWeight: '800', fontSize: 16 },

  resultsArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  trophyContainer: { alignItems: 'center', marginBottom: 32 },
  resultsTitle: { color: 'white', fontSize: 32, fontWeight: '800', marginTop: 24, marginBottom: 6 },
  editionLabel: { color: '#fcd34d', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  resultsSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },

  creditsCard: { backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 32, elevation: 10 },
  creditsLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  creditsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  creditsValue: { fontSize: 40, fontWeight: '800', color: '#d97706' },
  creditsNote: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },

  claimBtn: { backgroundColor: '#fcd34d', width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
  claimBtnText: { color: '#b45309', fontSize: 18, fontWeight: '800' },
});
