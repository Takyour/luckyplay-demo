import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let mode="login", currentUser=null, currentData=null, selectedGame="";
const $=id=>document.getElementById(id);

const views=["auth","home","leaderboard","profile","admin"];
function showView(name){
  views.forEach(v=>$(v+"View").classList.toggle("hidden",v!==name));
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  if(name==="leaderboard") loadLeaderboard();
  if(name==="admin") loadAdmin();
}

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  mode=btn.dataset.auth;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));
  $("nameInput").classList.toggle("hidden",mode!=="register");
  $("nameInput").required=mode==="register";
  $("authSubmit").textContent=mode==="register"?"Create account":"Login";
  $("passwordInput").autocomplete=mode==="register"?"new-password":"current-password";
});

$("authForm").onsubmit=async e=>{
  e.preventDefault();
  $("authMsg").textContent="Please wait…";
  try{
    if(mode==="register"){
      const cred=await createUserWithEmailAndPassword(auth,$("emailInput").value,$("passwordInput").value);
      const name=$("nameInput").value.trim()||"Player";
      await updateProfile(cred.user,{displayName:name});
      await setDoc(doc(db,"users",cred.user.uid),{
        uid:cred.user.uid,name,email:cred.user.email,coins:1000,wins:0,rounds:0,role:"user",createdAt:serverTimestamp()
      });
    }else{
      await signInWithEmailAndPassword(auth,$("emailInput").value,$("passwordInput").value);
    }
    $("authMsg").textContent="";
  }catch(err){$("authMsg").textContent=humanError(err)}
};

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){
    $("bottomNav").classList.add("hidden");
    $("authView").classList.remove("hidden");
    views.filter(v=>v!=="auth").forEach(v=>$(v+"View").classList.add("hidden"));
    return;
  }
  await loadMe();
  $("bottomNav").classList.remove("hidden");
  $("authView").classList.add("hidden");
  showView("home");
});

async function loadMe(){
  const snap=await getDoc(doc(db,"users",currentUser.uid));
  if(!snap.exists()){
    currentData={uid:currentUser.uid,name:currentUser.displayName||"Player",email:currentUser.email,coins:1000,wins:0,rounds:0,role:"user"};
    await setDoc(doc(db,"users",currentUser.uid),currentData);
  }else currentData=snap.data();
  renderMe();
}

function renderMe(){
  $("coinBalance").textContent=currentData.coins||0;
  $("profileName").textContent=currentData.name||"Player";
  $("profileEmail").textContent=currentData.email||"";
  $("profileCoins").textContent=currentData.coins||0;
  $("profileWins").textContent=currentData.wins||0;
  $("profileRounds").textContent=currentData.rounds||0;
  $("profileNameInput").value=currentData.name||"";
  $("avatar").textContent=(currentData.name||"P").charAt(0).toUpperCase();
  $("adminNav").classList.toggle("hidden",currentData.role!=="admin");
}

async function loadLeaderboard(){
  const q=query(collection(db,"users"),orderBy("coins","desc"),limit(20));
  const snap=await getDocs(q);
  const rows=snap.docs.map((d,i)=>({...d.data(),rank:i+1}));
  const html=rows.map(r=>`<div class="row"><div class="rank">#${r.rank}</div><div class="mini-avatar">${(r.name||"P").charAt(0).toUpperCase()}</div><div class="row-main"><b>${escapeHtml(r.name||"Player")}</b><small>${r.wins||0} wins · ${r.rounds||0} rounds</small></div><div class="row-score">🪙 ${r.coins||0}</div></div>`).join("");
  $("leaderboardList").innerHTML=html||'<div class="row">No players yet.</div>';
  $("miniLeaderboard").innerHTML=html;
}

document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("logoutBtn").onclick=()=>signOut(auth);

$("saveProfile").onclick=async()=>{
  const name=$("profileNameInput").value.trim();
  if(!name)return;
  await updateDoc(doc(db,"users",currentUser.uid),{name});
  currentData.name=name; renderMe();
};

document.querySelectorAll(".game-card").forEach(card=>card.onclick=()=>{
  selectedGame=card.dataset.game;
  $("gameTitle").textContent=selectedGame;
  $("gameStatus").textContent="Ready? 10 virtual coins per round.";
  $("gameAnimation").textContent=iconFor(selectedGame);
  $("gameModal").classList.remove("hidden");
});
$("closeGame").onclick=()=>$("gameModal").classList.add("hidden");

$("playRound").onclick=async()=>{
  if((currentData.coins||0)<10){$("gameStatus").textContent="Not enough virtual coins.";return}
  $("playRound").disabled=true;
  $("gameStatus").textContent="Animating…";
  $("gameAnimation").style.animationDuration=".25s";
  await sleep(1100);
  const reward=Math.floor(Math.random()*41); // demo-only reward
  const win=reward>=10;
  await updateDoc(doc(db,"users",currentUser.uid),{
    coins:increment(reward-10),
    rounds:increment(1),
    wins:increment(win?1:0)
  });
  currentData.coins+=reward-10; currentData.rounds=(currentData.rounds||0)+1; currentData.wins=(currentData.wins||0)+(win?1:0);
  renderMe();
  $("gameStatus").textContent=`Round complete: ${reward} virtual coins returned.`;
  $("playRound").disabled=false;
  $("gameAnimation").style.animationDuration="1.4s";
  loadLeaderboard();
};

async function loadAdmin(){
  if(currentData?.role!=="admin"){showView("home");return}
  const snap=await getDocs(collection(db,"users"));
  let total=0, rounds=0;
  const users=snap.docs.map(d=>d.data());
  users.forEach(u=>{total+=u.coins||0;rounds+=u.rounds||0});
  $("adminUsers").textContent=users.length;
  $("adminCoins").textContent=total;
  $("adminRounds").textContent=rounds;
  $("adminUsersList").innerHTML=users.slice(0,30).map(u=>`<div class="row"><div class="mini-avatar">${(u.name||"P").charAt(0)}</div><div class="row-main"><b>${escapeHtml(u.name||"Player")}</b><small>${escapeHtml(u.email||"")} · ${u.role||"user"}</small></div><div class="row-score">${u.coins||0}</div></div>`).join("");
}

function iconFor(g){return g==="Lucky Spin"?"🎡":g==="Dice Dash"?"🎲":g==="Card Flip"?"🃏":"💎"}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function humanError(e){return e.code?.replace("auth/","").replaceAll("-"," ")||"Something went wrong."}
