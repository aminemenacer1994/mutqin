@if (!empty($demoLogin))
<section class="auth-demo-card" aria-labelledby="auth-demo-title">
    <h2 id="auth-demo-title" class="auth-demo-card__title">{{ __('ui.auth_demo_try_title') }}</h2>
    <p class="auth-demo-card__lede">{{ __('ui.auth_demo_try_lede') }}</p>
    <div class="auth-demo-card__row">
        <span class="auth-demo-card__label">{{ __('ui.auth_demo_student') }}</span>
        <code class="auth-demo-card__value" id="demo-student-email">{{ $demoLogin['studentEmail'] }}</code>
        <button type="button" class="auth-demo-card__copy" data-copy-target="demo-student-email">{{ __('ui.auth_demo_copy') }}</button>
    </div>
    <div class="auth-demo-card__row">
        <span class="auth-demo-card__label">{{ __('ui.auth_demo_teacher') }}</span>
        <code class="auth-demo-card__value" id="demo-teacher-email">{{ $demoLogin['teacherEmail'] }}</code>
        <button type="button" class="auth-demo-card__copy" data-copy-target="demo-teacher-email">{{ __('ui.auth_demo_copy') }}</button>
    </div>
    <div class="auth-demo-card__actions">
        <button type="button" class="btn auth-demo-card__fill" id="demo-fill-student" data-demo-email="{{ $demoLogin['studentEmail'] }}" data-demo-password="{{ $demoLogin['password'] }}">{{ __('ui.auth_demo_fill_student') }}</button>
        <button type="button" class="btn auth-demo-card__fill auth-demo-card__fill--ghost" id="demo-fill-teacher" data-demo-email="{{ $demoLogin['teacherEmail'] }}" data-demo-password="{{ $demoLogin['password'] }}">{{ __('ui.auth_demo_fill_teacher') }}</button>
    </div>
</section>
<script>
(function () {
  function copyFrom(id) {
    var el = document.getElementById(id);
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.textContent.trim()).catch(function () {});
  }
  document.querySelectorAll('.auth-demo-card__copy').forEach(function (btn) {
    btn.addEventListener('click', function () { copyFrom(btn.getAttribute('data-copy-target')); });
  });
  function fill(email, password) {
    var emailEl = document.getElementById('email');
    var passEl = document.getElementById('password');
    if (emailEl) emailEl.value = email;
    if (passEl) passEl.value = password;
    emailEl && emailEl.focus();
  }
  var studentBtn = document.getElementById('demo-fill-student');
  var teacherBtn = document.getElementById('demo-fill-teacher');
  if (studentBtn) {
    studentBtn.addEventListener('click', function () {
      fill(studentBtn.getAttribute('data-demo-email'), studentBtn.getAttribute('data-demo-password'));
    });
  }
  if (teacherBtn) {
    teacherBtn.addEventListener('click', function () {
      fill(teacherBtn.getAttribute('data-demo-email'), teacherBtn.getAttribute('data-demo-password'));
    });
  }
})();
</script>
@endif
