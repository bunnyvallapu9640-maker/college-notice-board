const $ = id => document.getElementById(id);

let notices = [];
let loggedIn = sessionStorage.getItem("cc_admin") === "true";

async function apiRequest(path, options = {}){
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  if(!response.ok){
    const result = await response.json().catch(()=>({}));
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadNotices(){
  notices = await apiRequest("/api/notices");
  renderStudent();
  renderAdminAuth();
}

function escapeHTML(s=""){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function formatDate(d){ return new Date(d+"T00:00:00").toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}); }
function deptName(d){ return d==="GENERAL" ? "All Students" : d; }

function renderStudent(){
  const q=$("searchInput").value.trim().toLowerCase();
  const dept=$("departmentFilter").value, cat=$("categoryFilter").value;
  const filtered=notices.filter(n=>
    (dept==="ALL" || n.department===dept || n.department==="GENERAL") &&
    (cat==="ALL" || n.category===cat) &&
    (!q || `${n.title} ${n.description} ${n.department} ${n.category}`.toLowerCase().includes(q))
  ).sort((a,b)=>new Date(b.date)-new Date(a.date));
  $("noticeCount").textContent=notices.length;
  $("resultText").textContent=`Showing ${filtered.length} of ${notices.length} notices`;
  $("noticeGrid").innerHTML=filtered.map(n=>`
    <article class="notice-card">
      <div class="notice-meta">
        <span class="badge">${escapeHTML(deptName(n.department))}</span>
        <span class="badge">${escapeHTML(n.category)}</span>
        ${n.important?'<span class="badge important">★ Important</span>':""}
        <span class="date">${formatDate(n.date)}</span>
      </div>
      <h4>${escapeHTML(n.title)}</h4>
      <p>${escapeHTML(n.description)}</p>
      ${n.attachment ? `<a class="attachment" href="${n.attachment.data}" download="${escapeHTML(n.attachment.name)}">📎 ${escapeHTML(n.attachment.name)}</a>` : ""}
    </article>`).join("");
  $("emptyState").classList.toggle("hidden", filtered.length!==0);
}

function renderAdmin(){
  $("adminCount").textContent=notices.length;
  $("adminList").innerHTML=notices.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(n=>`
    <div class="admin-item">
      <div><h4>${escapeHTML(n.title)}</h4><p>${escapeHTML(deptName(n.department))} • ${escapeHTML(n.category)} • ${formatDate(n.date)} ${n.important?"• ★ Important":""}</p></div>
      <div class="item-actions">
        <button class="edit-btn" onclick="editNotice('${n.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteNotice('${n.id}')">Delete</button>
      </div>
    </div>`).join("");
}

function showToast(msg){
  $("toast").textContent=msg;$("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),2500);
}
function switchView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
  $(id).classList.add("active-view");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  if(id==="adminView") renderAdminAuth();
}
function renderAdminAuth(){
  $("loginPanel").classList.toggle("hidden",loggedIn);
  $("adminPanel").classList.toggle("hidden",!loggedIn);
  if(loggedIn) renderAdmin();
}
function resetForm(){
  $("noticeForm").reset(); $("editId").value=""; $("date").value=new Date().toISOString().slice(0,10);
  $("formTitle").textContent="Publish a Notice"; $("cancelEdit").classList.add("hidden"); $("currentAttachment").textContent="";
}

document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
["searchInput","departmentFilter","categoryFilter"].forEach(id=>$(id).addEventListener("input",renderStudent));
$("clearFilters").addEventListener("click",()=>{$("searchInput").value="";$("departmentFilter").value="ALL";$("categoryFilter").value="ALL";renderStudent()});

$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("username").value==="admin" && $("password").value==="admin123"){
    loggedIn=true;sessionStorage.setItem("cc_admin","true");$("loginError").textContent="";renderAdminAuth();showToast("Welcome, Administrator");
  } else $("loginError").textContent="Invalid username or password.";
});
$("logoutBtn").addEventListener("click",()=>{loggedIn=false;sessionStorage.removeItem("cc_admin");renderAdminAuth();showToast("Logged out successfully")});
$("cancelEdit").addEventListener("click",resetForm);

$("noticeForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try {
    const file=$("attachment").files[0];
    let attachment=null;
    if(file){
      if(file.size>2*1024*1024){showToast("Attachment must be under 2 MB.");return;}
      attachment=await fileToData(file);
    }
    const id=$("editId").value;
    const old=notices.find(n=>n.id===id);
    const notice={
      title:$("title").value.trim(),department:$("department").value,category:$("category").value,
      date:$("date").value,important:$("important").checked,description:$("description").value.trim(),
      attachment:attachment || old?.attachment || null
    };
    if(id){
      const updated=await apiRequest(`/api/notices/${encodeURIComponent(id)}`,{
        method:"PUT",body:JSON.stringify(notice)
      });
      notices=notices.map(item=>item.id===id?updated:item);
      showToast("Notice updated");
    }else{
      const created=await apiRequest("/api/notices",{method:"POST",body:JSON.stringify(notice)});
      notices.push(created);
      showToast("Notice published");
    }
    resetForm();renderStudent();renderAdmin();
  } catch(error) {
    showToast(error.message);
  }
});
function fileToData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result});r.onerror=reject;r.readAsDataURL(file)})}

window.editNotice=function(id){
  const n=notices.find(x=>x.id===id); if(!n)return;
  $("editId").value=n.id;$("title").value=n.title;$("department").value=n.department;$("category").value=n.category;
  $("date").value=n.date;$("important").checked=n.important;$("description").value=n.description;
  $("formTitle").textContent="Edit Notice";$("cancelEdit").classList.remove("hidden");
  $("currentAttachment").textContent=n.attachment?`Current attachment: ${n.attachment.name}`:"No attachment";
  window.scrollTo({top:0,behavior:"smooth"});
};
window.deleteNotice=async function(id){
  const n=notices.find(x=>x.id===id);
  if(!n || !confirm(`Delete "${n.title}"?`)) return;
  try {
    await apiRequest(`/api/notices/${encodeURIComponent(id)}`,{method:"DELETE"});
    notices=notices.filter(x=>x.id!==id);renderStudent();renderAdmin();showToast("Notice deleted");
  } catch(error) {
    showToast(error.message);
  }
};

$("date").value=new Date().toISOString().slice(0,10);
renderStudent();renderAdminAuth();
loadNotices().catch(error=>{
  $("resultText").textContent="Could not load notices from the database.";
  showToast(error.message);
});
