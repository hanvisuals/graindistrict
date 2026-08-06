// Shared driving helpers.
//
// Below 1024px the board's top-bar buttons are not on the bar any more - they
// live behind the ⋯ menu. Several of these tests run at 794px so their print
// screenshots come out A4-shaped, which puts them squarely in that range, so
// they have to open the menu first. That is what a person on a tablet does.
async function clickBarBtn(page, sel){
  const more = await page.$('#cbarMore');
  if(more && await more.isVisible()){
    const target = await page.$(sel);
    if(!target || !(await target.isVisible())) await more.click();
  }
  await page.click(sel);
}
module.exports = { clickBarBtn };
