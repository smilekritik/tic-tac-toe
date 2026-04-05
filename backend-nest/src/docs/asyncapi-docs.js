document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tag-header').forEach((header) => {
    header.addEventListener('click', function onClick() {
      const section = this.parentElement;
      section?.classList.toggle('expanded');
    });
  });

  document.querySelectorAll('.operation-header').forEach((header) => {
    header.addEventListener('click', function onClick() {
      const operation = this.parentElement;
      operation?.classList.toggle('expanded');
    });
  });

  const firstSection = document.querySelector('.tag-section');
  if (firstSection) {
    firstSection.classList.add('expanded');
  }
});
