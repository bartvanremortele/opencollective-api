import {expect} from 'chai';
import models from '../server/models';
import * as utils from '../test/utils';
import sinon from 'sinon';
import emailLib from '../server/lib/email';

const {
  Transaction,
  Collective,
  User
} = models;

describe('Collective model', () => {

  let collective = {}, opensourceCollective, user1, user2, host;
  let sandbox, sendEmailSpy;

  const collectiveData = {
    slug: 'tipbox',
    name: 'tipbox',
    currency: 'USD',
    tags: ['#brusselstogether'],
    tiers: [
      {
        name: 'backer',
        range: [2, 100],
        interval: 'monthly'
      },
      {
        name: 'sponsor',
        range: [100, 100000],
        interval: 'yearly'
      }
    ]
  };

  const users = [{
    username: 'xdamman',
    email: 'xdamman@opencollective.com'
  },{
    username: 'piamancini',
    email: 'pia@opencollective.com'
  }];

  const transactions = [{
    createdAt: new Date('2016-06-14'),
    amount: -1000,
    netAmountInCollectiveCurrency: -1000,
    currency: 'USD',
    type: 'DEBIT',
    description: 'pizza',
    tags: ['food'],
    CreatedByUserId: 1,
    FromCollectiveId: 1
  },{
    createdAt: new Date('2016-07-14'),
    amount: -15000,
    netAmountInCollectiveCurrency: -15000,
    currency: 'USD',
    type: 'DEBIT',
    description: 'stickers',
    tags: ['marketing'],
    CreatedByUserId: 1,
    FromCollectiveId: 1
  },{
    createdAt: new Date('2016-06-15'),
    amount: 25000,
    amountInHostCurrency: 25000,
    netAmountInCollectiveCurrency: 22500,
    currency: 'USD',
    type: 'CREDIT',
    CreatedByUserId: 1,
    FromCollectiveId: 1
  },{
    createdAt: new Date('2016-07-16'),
    amount: 50000,
    amountInHostCurrency: 50000,
    netAmountInCollectiveCurrency: 45000,
    currency: 'USD',
    type: 'CREDIT',
    CreatedByUserId: 1,
    FromCollectiveId: 1
  },
  {
    createdAt: new Date('2016-08-18'),
    amount: 500,
    amountInHostCurrency: 50000,
    netAmountInCollectiveCurrency: 45000,
    currency: 'USD',
    type: 'CREDIT',
    CreatedByUserId: 2,
    FromCollectiveId: 2
  }];


  before(() => {
    sandbox = sinon.createSandbox();
    sendEmailSpy = sandbox.spy(emailLib, 'sendMessage');
  });

  after(() => sandbox.restore());

  before(() => utils.resetTestDB());

  before(() => User.createUserWithCollective(users[0])
    .tap(u => user1 = u)
    .then(() => User.createUserWithCollective(users[1]))
    .tap(u => user2 = u)
    .then(() => User.createUserWithCollective(utils.data('host1')))
    .tap(u => host = u)
    .then(() => Collective.create(collectiveData))
    .then(g => collective = g)
    .then(() => Collective.create({
      slug: 'webpack',
      tags: ['open source'],
      isActive: true
    }))
    .then(g => opensourceCollective = g)
    .then(() => collective.addUserWithRole(user1, 'BACKER'))
    .then(() => models.Expense.create({ description: 'pizza', amount: 1000, currency: 'USD', UserId: user1.id, lastEditedById: user1.id, incurredAt: transactions[0].createdAt, createdAt: transactions[0].createdAt, CollectiveId: collective.id }))
    .then(() => models.Expense.create({ description: 'stickers', amount: 15000, currency: 'USD', UserId: user1.id, lastEditedById: user1.id, incurredAt: transactions[1].createdAt, createdAt: transactions[1].createdAt, CollectiveId: collective.id }))
    .then(() => Transaction.createManyDoubleEntry([transactions[2]], { CollectiveId: opensourceCollective.id, HostCollectiveId: host.CollectiveId }))
    .then(() => Transaction.createManyDoubleEntry(transactions, { CollectiveId: collective.id, HostCollectiveId: host.CollectiveId })));

  it('creates a unique slug', () => {
    return Collective
      .create({slug: 'piamancini'})
      .tap(collective => {
        expect(collective.slug).to.equal('piamancini')
      })
      .then(() => Collective.create({ name: 'XavierDamman'}))
      .then(collective => {
        expect(collective.slug).to.equal('xavierdamman')
      })
      .then(() => Collective.create({ name: 'piamancini2' }))
      .then(() => Collective.create({ twitterHandle: '@piamancini'}))
      .then(collective => {
        expect(collective.slug).to.equal('piamancini1')
        expect(collective.twitterHandle).to.equal('piamancini')
      })
      .then(() => Collective.create({ name: 'XavierDamman' }))
      .then(collective => {
        expect(collective.slug).to.equal('xavierdamman1')
      })
      .then(() => Collective.create({ name: 'hélène & les g.arçons' }))
      .then(collective => {
        expect(collective.slug).to.equal('helene-and-les-garcons');
      })
  })

  describe('events', () => {
    it('generates the ICS for an EVENT collective', async () => {
      const d = new Date;
      const startsAt = d.setMonth(d.getMonth() + 1);
      const endsAt = new Date(startsAt);
      endsAt.setHours(endsAt.getHours() + 2);
      const event = await models.Collective.create({
        type: 'EVENT',
        ParentCollectiveId: collective.id,
        name: "Sustain OSS London 2019",
        description: "Short description",
        longDescription: "Longer description",
        slug: "sustainoss-london",
        startsAt,
        endsAt,
      });
      const ics = await event.getICS();
      expect(ics).to.contain("STATUS:CONFIRMED");
      expect(ics).to.contain("/tipbox/events/sustainoss-london");
      expect(ics).to.contain("hello@tipbox.opencollective.com");
    });
  });

  describe("hosts", () => {
    let newHost;

    before(async () => {
      expect(collective.HostCollectiveId).to.be.null;
      await collective.addHost(host.collective, host);
      expect(collective.HostCollectiveId).to.equal(host.CollectiveId);
      newHost = await models.Collective.create({
        name: "BrusselsTogether",
        slug: "brusselstogether",
        type: "ORGANIZATION",
        CreatedByUserId: user1.id
      });
      await models.Member.create({
        CollectiveId: newHost.id,
        MemberCollectiveId: user1.CollectiveId,
        role: 'ADMIN',
        CreatedByUserId: user1.id
      });
      user1.populateRoles();
      user2.populateRoles();
    });

    it("fails to add another host", async () => {
      try {
        await collective.addHost(newHost, user1);
      } catch (e) {
        expect(e.message).to.contain(`This collective already has a host`);
      }
    });

    it("fails to change host if there is a pending balance", async () => {
      try {
        await collective.changeHost();
      } catch (e) {
        expect(e.message).to.contain("Unable to change host: you still have a balance of $965");
      }
    });

    it("changes host successfully", async () => {
      const newCollective = await models.Collective.create({
        name: "New collective",
        slug: "new-collective",
        type: "COLLECTIVE",
        isActive: false,
        CreatedByUserId: user1.id
      });
      await newCollective.addHost(host, user1);
      await newCollective.changeHost(newHost, user1);
      expect(newCollective.HostCollectiveId).to.equal(newHost.id);
      // if the user making the request is an admin of the host, isActive should turn to true
      expect(newCollective.isActive).to.be.true;
      const membership = await models.Member.findOne({ where: { role: 'HOST', CollectiveId: newCollective.id }});
      expect(membership).to.exist;
      expect(membership.MemberCollectiveId).to.equal(newHost.id);
      expect(newCollective.HostCollectiveId).to.equal(newHost.id);
      // moving to a host where the user making the request is not an admin of turns isActive to false
      await newCollective.changeHost(host, user2);
      expect(newCollective.HostCollectiveId).to.equal(host.id);
      expect(newCollective.isActive).to.be.false;
    });
  });

  it('creates an organization and populates logo image', (done) => {
    models.Collective.create({
      name: "Open Collective",
      type: "ORGANIZATION",
      website: "https://opencollective.com"
    }).then(collective => {
      expect(collective.image).to.equal("https://logo.clearbit.com/opencollective.com");
      models.Collective.findById(collective.id).then(c => {
        expect(c.image).to.equal("https://logo.clearbit.com/opencollective.com");
        done();
      })
    })
  });

  it("creates an organization with an admin user", async () => {
    models.Collective.createOrganization({
      name: "Coinbase"
    }, user1)
    await utils.waitForCondition(() => sendEmailSpy.callCount > 0);
    // utils.inspectSpy(sendEmailSpy, 3);
    expect(sendEmailSpy.firstCall.args[0]).to.equal(user1.email);
    expect(sendEmailSpy.firstCall.args[1]).to.equal("Welcome to Open Collective 🙌");
    expect(sendEmailSpy.firstCall.args[2]).to.contain("Discover");
  });

  it('creates a user and populates avatar image', (done) => {
    models.User.createUserWithCollective({
      name: "Xavier Damman",
      type: "USER",
      email: "xavier@tribal.be"
    }).then(user => {
      expect(user.collective.image).to.equal(undefined);
      setTimeout(() => {
        models.Collective.findById(user.collective.id).then(c => {
          expect(c.image).to.equal("https://www.gravatar.com/avatar/a97d0fcd96579015da610aa284f8d8df?default=404");
          done();
        })
      }, 700);
    })
  });

  it('computes the balance ', () =>
    collective.getBalance().then(balance => {
      let sum = 0;
      transactions.map(t => sum += t.netAmountInCollectiveCurrency);
      expect(balance).to.equal(sum);
    }));

  it('computes the balance until a certain month', (done) => {
    const until = new Date('2016-07-01');
    collective.getBalance(until).then(balance => {
      let sum = 0;
      transactions.map(t => {
        if (t.createdAt < until)
          sum += t.netAmountInCollectiveCurrency
      });
      expect(balance).to.equal(sum);
      done();
    })
  });

  it('computes the number of backers', () => collective.getBackersCount()
    .then(count => {
      expect(count).to.equal(users.length);
    }));

  it('computes the number of backers until a certain month', (done) => {
    const until = new Date('2016-07-01');
    collective.getBackersCount({until}).then(count => {
      const backers = {};
      transactions.map(t => {
        if (t.amount > 0 && t.createdAt < until)
          backers[t.CreatedByUserId] = t.amount;
      });
      expect(count).to.equal(Object.keys(backers).length);
      done();
    })
  });

  it('gets all the expenses', (done) => {
    let totalExpenses = 0;
    transactions.map(t => {
      if (t.netAmountInCollectiveCurrency < 0)
        totalExpenses++;
    });

    collective.getExpenses()
      .then(expenses => {
        expect(expenses.length).to.equal(totalExpenses);
        done();
      })
      .catch(e => {
        console.error('error', e, e.stack);
        done(e);
      });
  });

  it('gets all the expenses in a given month', (done) => {
    const startDate = new Date('2016-06-01');
    const endDate = new Date('2016-07-01');

    let totalExpenses = 0;

    transactions.map(t => {
      if (t.netAmountInCollectiveCurrency < 0 && t.createdAt > startDate && t.createdAt < endDate)
        totalExpenses++;
    });

    collective.getExpenses(null, startDate, endDate)
      .then(expenses => {
        expect(expenses.length).to.equal(totalExpenses);
        done();
      })
      .catch(e => {
        console.error('error', e, e.stack);
      });
  });

  it('get the related collectives', () => {
    const defaultValues = {HostCollectiveId: host.CollectiveId, PaymentMethodId: 1 };
    return Collective.createMany(utils.data('relatedCollectives'))
    .then(collectives => collectives.map(c => c.id))
    .map(CollectiveId => Transaction.createDoubleEntry({...transactions[2], CollectiveId, ...defaultValues}))
    .then(() => collective.getRelatedCollectives(3, 0))
    .then(relatedCollectives => {
      expect(relatedCollectives).to.have.length(3);
    })
  });

  describe("backers", () => {

    it('gets the top backers', () => {
      return Collective.getTopBackers()
        .then(backers => {
          backers = backers.map(g => g.dataValues);
          expect(backers.length).to.equal(3);
          expect(backers[0].totalDonations).to.equal(175000);
          expect(backers[0]).to.have.property('website');
        });
    });

    it('gets the top backers in a given month', () => {
      return Collective.getTopBackers(new Date('2016-06-01'), new Date('2016-07-01'))
        .then(backers => {
          backers = backers.map(g => g.dataValues);
          expect(backers.length).to.equal(2);
          expect(backers[0].totalDonations).to.equal(125000);
        });
    });

    it('gets the top backers in open source', () => {
      return Collective.getTopBackers(new Date('2016-06-01'), new Date('2016-07-01'), ['open source'])
        .then(backers => {
          backers = backers.map(g => g.dataValues);
          expect(backers.length).to.equal(1);
          expect(backers[0].totalDonations).to.equal(25000);
        });
    });

    it('gets the latest transactions of a user collective', () => {
      return Collective.findOne({where: { type: 'USER' }}).then(userCollective => {
        return userCollective.getLatestTransactions(new Date('2016-06-01'), new Date('2016-08-01'))
          .then(transactions => {
            expect(transactions.length).to.equal(8);
          })
      });
    });

    it('gets the latest transactions of a user collective to open source', () => {
      return Collective.findOne({where: { type: 'USER' }}).then(userCollective => {
        return userCollective.getLatestTransactions(new Date('2016-06-01'), new Date('2016-08-01'), ['open source'])
          .then(transactions => {
            expect(transactions.length).to.equal(1);
            expect(transactions[0]).to.have.property("amount");
            expect(transactions[0]).to.have.property("currency");
            expect(transactions[0]).to.have.property("collective");
            expect(transactions[0].collective).to.have.property("name");
          })
      });
    });
  });

  describe("tiers", () => {
    before('adding user as backer', () => collective.addUserWithRole(user2, 'BACKER'))
    before('creating order for backer tier', () => models.Order.create({
      CreatedByUserId: user1.id,
      FromCollectiveId: user1.CollectiveId,
      CollectiveId: collective.id,
      TierId: 1
    }));

    before('creating order for sponsor tier', () => models.Order.create({
      CreatedByUserId: user2.id,
      FromCollectiveId: user2.CollectiveId,
      CollectiveId: collective.id,
      TierId: 2
    }));

    it('get the tiers with users', (done) => {
      collective.getTiersWithUsers()
        .then(tiers => {
          expect(tiers).to.have.length(2);
          const users = tiers[0].getDataValue('users');
          expect(users).to.not.be.undefined;
          expect(users).to.have.length(1);
          const backer = users[0];
          expect(parseInt(backer.totalDonations, 10)).to.equal(transactions[2].amountInHostCurrency + transactions[3].amountInHostCurrency);
          expect(new Date(backer.firstDonation).getTime()).to.equal(new Date(transactions[2].createdAt).getTime());
          expect(new Date(backer.lastDonation).getTime()).to.equal(new Date(transactions[3].createdAt).getTime());
          done();
        })
        .catch(e => {
          done(e);
        });
    });

    it('add/update/create new tiers', done => {
      // This add a new tier and removes the "sponsors" tier
      collective.editTiers([
        {
          id: 1,
          name: 'super backer',
          amount: 1500
        },
        {
          name: 'new tier',
          amount: 2000,
          slug: 'newtier'
        }
      ])
      .then(tiers => {
        expect(tiers.length).to.equal(2);
        tiers.sort((a,b) => b.slug < a.slug);
        expect(tiers[0].name).to.equal('new tier');
        expect(tiers[1].name).to.equal('super backer');
        done();
      })
    })
  });

  describe("members", () => {
    it("gets email addresses of admins", async () => {
      await collective.editMembers([
        {
          id: user1.id,
          MemberCollectiveId: user1.CollectiveId,
          role: 'ADMIN'
        },
        {
          role: 'ADMIN',
          member: {
            name: 'Etienne Dupont',
            email: 'etiennedupont@email.com'
          }
        }
      ]);
      const emails = await collective.getEmails();
      expect(emails.length).to.equal(2);
    });

    it("add/update/remove members", (done) => {
      collective.editMembers([
        {
          id: user1.id,
          MemberCollectiveId: user1.CollectiveId,
          role: 'ADMIN'
        },
        {
          role: 'MEMBER',
          member: {
            name: 'Etienne Dupont',
            email: 'etiennedupont@email.com'
          }
        }
      ]).then(members => {
        expect(members.length).to.equal(2);
        expect(members[0].role).to.equal('ADMIN');
        expect(members[1].role).to.equal('MEMBER');
        done();
      })
    });

    it("add an existing user to a collective by email address", (done) => {
      collective.editMembers([])
      .then(members => {
        expect(members).to.have.length(0);
      })
      .then(() => collective.editMembers([
        {
          role: 'MEMBER',
          member: {
            name: user1.name,
            email: user1.email
          }
        }
      ]))
      .then(members => {
        expect(members).to.have.length(1);
        expect(members[0].role).to.equal('MEMBER');
        expect(members[0].MemberCollectiveId).to.equal(user1.CollectiveId);
        done();
      });
    });
  });

  describe("goals", () => {

    it("returns the next goal based on balance", async () => {
      const goals = [
        {
          type: 'yearlyBudget',
          amount: 500000,
          title: "hire fte"
        },
        {
          type: 'balance',
          amount: 200000,
          title: "buy laptop"
        }
      ];
      await collective.update({ settings: { goals }});
      const nextGoal = await collective.getNextGoal();
      expect(nextGoal.type).to.equal('balance');
      expect(nextGoal.amount).to.equal(200000);
      expect(nextGoal.progress).to.equal(0.48);
      expect(nextGoal.percentage).to.equal("48%");
      expect(nextGoal.missing.amount).to.equal(103500)
    });

    it("returns the next goal based on yearlBudget", async () => {
      const goals = [
        {
          type: 'yearlyBudget',
          amount: 500000,
          title: "hire fte"
        },
        {
          type: 'balance',
          amount: 5000,
          title: "buy stickers"
        }
      ];
      await collective.update({ settings: { goals }});
      const nextGoal = await collective.getNextGoal();
      expect(nextGoal.type).to.equal('yearlyBudget');
      expect(nextGoal.amount).to.equal(500000);
      expect(nextGoal.interval).to.equal("year");
      expect(nextGoal.missing.amount).to.equal(41667);
      expect(nextGoal.missing.interval).to.equal("month");
    });

  });

});
