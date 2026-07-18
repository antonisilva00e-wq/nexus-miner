// Modal component
const Modal = {
  open(title, bodyHTML, footerHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '';
    document.getElementById('modal-backdrop').classList.add('active');
    lucide.createIcons();
  },

  close() {
    document.getElementById('modal-backdrop').classList.remove('active');
  }
};

// Close modal on backdrop click
document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-backdrop') Modal.close();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') Modal.close();
});
