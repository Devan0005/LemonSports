document.addEventListener('DOMContentLoaded', function(){
    console.log('Gym page loaded');

    // mobile nav toggle (existing)
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('mainNav');
    toggle && toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
    });

    // highlight current nav link (applies on every page)
    (function highlightNav(){
        const links = Array.from(document.querySelectorAll('a.nav-link'));
        const current = location.pathname.split('/').pop() || 'index.html';
        links.forEach(a=>{
            // normalize href -> filename
            const href = a.getAttribute('href').split('/').pop();
            if ( (href === 'index.html' && (current === '' || current === 'index.html')) || href === current ) {
                a.classList.add('active');
                a.setAttribute('aria-current','page');
            } else {
                a.classList.remove('active');
                a.removeAttribute('aria-current');
            }
        });
    })();

    // enable tapping flip on touch devices (run on every page)
    document.querySelectorAll('.flip-card').forEach(card=>{
      card.addEventListener('click', function(e){
        card.classList.toggle('flipped');
      });
    });

    // --- Step-by-step membership UI --- 
    // run only if membership form exists on the page
    const form = document.getElementById('membershipForm');
    if (!form) {
        // membership form not on this page — stop membership logic
        return;
    }
    // if form exists, continue with membership UI handling below

    const steps = Array.from(form.querySelectorAll('.step'));
    const total = steps.length;
    let index = 0;
    const state = {}; // store answers

    // price map (example)
    const priceMap = { '1': 999, '3': 2599, '6': 4799, '12': 8999 };

    // UI refs
    const progressFill = document.querySelector('#progressBar .progress-fill');
    const stepsDots = document.getElementById('stepsDots');
    const reviewBox = document.getElementById('reviewBox');
    const priceEl = document.getElementById('price');
    const confirmBox = document.getElementById('confirmBox');
    const backBtn = document.getElementById('backBtn');
    const buyBtn = document.getElementById('buyBtn');

    // build dots
    for (let i=0;i<total;i++){
        const d = document.createElement('span');
        d.className = 'dot' + (i===0 ? ' active' : '');
        stepsDots.appendChild(d);
    }

    function showStep(i){
        steps.forEach((s,idx) => {
            s.classList.toggle('active', idx === i);
            s.classList.toggle('left', idx < i);
            s.classList.toggle('right', idx > i);
        });
        // progress
        const pct = Math.round((i) / (total-1) * 100);
        if (progressFill) progressFill.style.width = pct + '%';
        // dots
        Array.from(stepsDots.children).forEach((d,idx)=> d.classList.toggle('active', idx<=i));
        // hide/show back button in review step area (button is inside step 8)
        if (backBtn) backBtn.style.display = (i === 0 ? 'none' : 'inline-block');
        updateReview();
    }

    function updateReview(){
        // fill review box and price
        if (!reviewBox) return;
        const dur = state.duration || '';
        const p = priceMap[dur] || 0;
        priceEl && (priceEl.textContent = 'Price: ₹' + p.toLocaleString());
        reviewBox.innerHTML = `
          <div class="review-row"><strong>Gender:</strong> ${escapeHtml(state.gender || '-')}</div>
          <div class="review-row"><strong>Age:</strong> ${escapeHtml(state.age || '-')}</div>
          <div class="review-row"><strong>Height:</strong> ${escapeHtml(state.height || '-')} cm</div>
          <div class="review-row"><strong>Weight:</strong> ${escapeHtml(state.weight || '-')} kg</div>
          <div class="review-row"><strong>Goal:</strong> ${escapeHtml(goalLabel(state.goal) || '-')}</div>
          <div class="review-row"><strong>Duration:</strong> ${dur ? dur+' month(s)' : '-'}</div>
          <div class="review-row"><strong>Slot:</strong> ${escapeHtml(state.slotDate || '-') } ${escapeHtml(state.slotTime || '')}</div>
        `;
    }

    function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
    function goalLabel(v){
        return v === 'reduce' ? 'Reduce weight' : v === 'increase' ? 'Increase weight' : v === 'bulk' ? 'Make a bulk body' : v;
    }

    // initial
    showStep(index);

    // choice buttons (radio-like)
    form.addEventListener('click', function(e){
        const btn = e.target.closest('.choice');
        if (!btn) return;
        const value = btn.getAttribute('data-value');
        // determine which step this button belongs to
        const stepEl = btn.closest('.step');
        const stepNum = parseInt(stepEl.getAttribute('data-step'),10);

        // save based on step
        if (stepNum === 0) state.gender = value;
        else if (stepNum === 4) state.goal = value;
        else if (stepNum === 5) state.duration = value;
        else if (stepNum === 7) state.slotTime = value;

        // visual selection
        Array.from(stepEl.querySelectorAll('.choice')).forEach(c => c.classList.toggle('selected', c === btn));
        // for duration selection update price immediately
        updateReview();

        // move next after small delay for UX
        setTimeout(() => goNext(), 180);
    });

    // numeric and date inputs: proceed on Enter or when filled valid
    ['age','height','weight','slotDate'].forEach(id=>{
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('keydown', function(e){
            if (e.key === 'Enter') {
                e.preventDefault();
                if (el.checkValidity()) {
                    state[id] = el.value;
                    goNext();
                } else {
                    el.reportValidity();
                }
            }
        });
        el.addEventListener('blur', function(){
            if (el.value) state[id] = el.value;
        });
    });

    // Back button (in review step)
    backBtn && backBtn.addEventListener('click', function(){ goPrev(); });

    // Buy handler
    buyBtn && buyBtn.addEventListener('click', function(){
        // minimal validation
        const required = ['gender','age','height','weight','goal','duration','slotDate','slotTime'];
        for (const k of required){
            if (!state[k]) {
                // if missing, find first missing step and jump
                const missingIndex = findFirstMissingStep(k);
                index = missingIndex; showStep(index); return;
            }
        }
        // prepare data
        const data = {
            gender: state.gender,
            age: state.age,
            height: state.height,
            weight: state.weight,
            goal: state.goal,
            durationMonths: state.duration,
            slotDate: state.slotDate,
            slotTime: state.slotTime,
            price: priceMap[state.duration] || 0,
            createdAt: new Date().toISOString()
        };
        // store locally
        let bookings = JSON.parse(localStorage.getItem('lemon_memberships') || '[]');
        bookings.push(data);
        localStorage.setItem('lemon_memberships', JSON.stringify(bookings));

        // show confirmation
        confirmBox.innerHTML = `
          <div class="confirm-inner">
            <h3>Membership Confirmed</h3>
            <p>Slot reserved on <strong>${escapeHtml(data.slotDate)}</strong> (${escapeHtml(data.slotTime)}).</p>
            <p>Duration: <strong>${data.durationMonths} month(s)</strong> — Price: <strong>₹${data.price}</strong></p>
            <p class="muted">Saved locally. Integrate a backend/payment gateway to accept payments.</p>
          </div>
        `;
        // reset state for new booking
        form.reset();
        for (const k in state) delete state[k];
        // go back to first step after a pause
        setTimeout(()=>{ index = 0; showStep(index); }, 600);
    });

    // helpers
    function goNext(){
        // validate current step before moving
        const cur = steps[index];
        if (!validateStep(cur)) return;
        index = Math.min(total-1, index+1);
        showStep(index);
        // autofocus first input in step
        const nextInput = steps[index].querySelector('input');
        nextInput && nextInput.focus();
    }
    function goPrev(){ index = Math.max(0, index-1); showStep(index); }

    function validateStep(stepEl){
        const n = parseInt(stepEl.getAttribute('data-step'),10);
        if (n === 0){
            if (!state.gender) { flashInvalid(stepEl); return false; }
            return true;
        }
        if (n ===1 || n===2 || n===3){
            const id = n===1? 'age' : n===2? 'height' : 'weight';
            const el = document.getElementById(id);
            if (!el || !el.value) { flashInvalid(stepEl); el && el.focus(); return false; }
            state[id] = el.value;
            return true;
        }
        if (n===4){
            if (!state.goal) { flashInvalid(stepEl); return false; }
            return true;
        }
        if (n===5){
            if (!state.duration) { flashInvalid(stepEl); return false; }
            return true;
        }
        if (n===6){
            const el = document.getElementById('slotDate');
            if (!el || !el.value) { flashInvalid(stepEl); el && el.focus(); return false; }
            state.slotDate = el.value;
            return true;
        }
        if (n===7){
            if (!state.slotTime) { flashInvalid(stepEl); return false; }
            return true;
        }
        return true;
    }

    function flashInvalid(el){
        el.classList.add('invalid');
        setTimeout(()=> el.classList.remove('invalid'), 700);
    }

    function findFirstMissingStep(key){
        // map required keys to step index
        const map = { gender:0, age:1, height:2, weight:3, goal:4, duration:5, slotDate:6, slotTime:7 };
        return map[key] !== undefined ? map[key] : 0;
    }
});